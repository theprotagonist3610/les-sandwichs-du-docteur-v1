/**
 * COMMANDE TOOLKIT 2 - FONCTIONNALITÉS AVANCÉES
 *
 * Extension de commandeToolkit.jsx avec 9 fonctionnalités avancées:
 * 1. Notifications push PWA en temps réel
 * 2. Synchronisation bidirectionnelle offline
 * 3. Historique des modifications (audit trail)
 * 4. Optimisation des requêtes géographiques (PostGIS)
 * 5. Validation côté serveur
 * 6. Analytics et rapports
 * 7. Prédictions ML (volume, délais)
 * 8. Génération de documents (Excel, factures)
 * 9. Recherche full-text
 *
 * Interconnecté avec commandeToolkit.jsx
 */

import { supabase } from "@/config/supabase";
import * as commandeToolkit from "./commandeToolkit";

// ============================================================================
// 1. NOTIFICATIONS PUSH PWA
// ============================================================================

/**
 * Demander la permission pour les notifications push
 * @returns {Promise<{granted, error}>}
 */
export const requestNotificationPermission = async () => {
  try {
    if (!("Notification" in window)) {
      return { granted: false, error: "Notifications non supportées par ce navigateur" };
    }

    if (Notification.permission === "granted") {
      return { granted: true, error: null };
    }

    if (Notification.permission === "denied") {
      return { granted: false, error: "Permission refusée par l'utilisateur" };
    }

    const permission = await Notification.requestPermission();
    return { granted: permission === "granted", error: null };
  } catch (error) {
    console.error("Erreur lors de la demande de permission:", error);
    return { granted: false, error };
  }
};

/**
 * Envoyer une notification push locale
 * @param {Object} options - Options de notification
 * @returns {Promise<{success, error}>}
 */
export const sendLocalNotification = async ({ title, message, data = {} }) => {
  try {
    const { granted } = await requestNotificationPermission();

    if (!granted) {
      return { success: false, error: "Permission non accordée" };
    }

    const notification = new Notification(title, {
      body: message,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-64x64.png",
      tag: data.commande_id || "commande-notification",
      data,
      requireInteraction: data.priority === "high" || data.priority === "urgent",
    });

    notification.onclick = (event) => {
      event.preventDefault();
      if (data.commande_id) {
        window.focus();
        // Naviguer vers la commande
        window.location.href = `/commandes?id=${data.commande_id}`;
      }
      notification.close();
    };

    return { success: true, error: null };
  } catch (error) {
    console.error("Erreur lors de l'envoi de notification:", error);
    return { success: false, error };
  }
};

/**
 * Créer une notification dans la queue Supabase
 * @param {Object} notificationData - Données de notification
 * @returns {Promise<{notification, error}>}
 */
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from("notifications_queue")
      .insert({
        type: notificationData.type,
        priority: notificationData.priority || "normal",
        recipient_id: notificationData.recipient_id,
        recipient_role: notificationData.recipient_role,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        commande_id: notificationData.commande_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création de notification:", error);
      return { notification: null, error };
    }

    return { notification: data, error: null };
  } catch (error) {
    console.error("Exception lors de la création de notification:", error);
    return { notification: null, error };
  }
};

/**
 * Récupérer les notifications d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} status - Statut des notifications
 * @returns {Promise<{notifications, error}>}
 */
export const getUserNotifications = async (userId, status = "pending") => {
  try {
    const { data, error } = await supabase
      .from("notifications_queue")
      .select("*")
      .eq("recipient_id", userId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des notifications:", error);
      return { notifications: [], error };
    }

    return { notifications: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des notifications:", error);
    return { notifications: [], error };
  }
};

/**
 * S'abonner aux notifications en temps réel via Supabase Realtime
 * @param {string} userId - ID de l'utilisateur
 * @param {Function} onNotification - Callback appelé lors d'une nouvelle notification
 * @returns {Function} Fonction de désabonnement
 */
export const subscribeToNotifications = (userId, onNotification) => {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications_queue",
        filter: `recipient_id=eq.${userId}`,
      },
      async (payload) => {
        const notification = payload.new;

        // Envoyer une notification push locale
        await sendLocalNotification({
          title: notification.title,
          message: notification.message,
          data: {
            ...notification.data,
            commande_id: notification.commande_id,
            priority: notification.priority,
          },
        });

        // Appeler le callback
        if (onNotification) {
          onNotification(notification);
        }
      }
    )
    .subscribe();

  // Retourner la fonction de désabonnement
  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================================================
// 2. SYNCHRONISATION BIDIRECTIONNELLE OFFLINE
// ============================================================================

/**
 * Ajouter une opération à la queue de synchronisation
 * @param {Object} syncData - Données de synchronisation
 * @returns {Promise<{syncItem, error}>}
 */
export const addToSyncQueue = async (syncData) => {
  try {
    const { data, error } = await supabase
      .from("commandes_sync_queue")
      .insert({
        commande_id: syncData.commande_id,
        operation: syncData.operation,
        local_data: syncData.local_data,
        local_version: syncData.local_version,
        user_id: syncData.user_id,
        conflict_resolution_strategy: syncData.conflict_resolution_strategy || "server_wins",
        metadata: syncData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de l'ajout à la queue de sync:", error);
      return { syncItem: null, error };
    }

    return { syncItem: data, error: null };
  } catch (error) {
    console.error("Exception lors de l'ajout à la queue de sync:", error);
    return { syncItem: null, error };
  }
};

/**
 * Récupérer les items en attente de synchronisation
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{syncItems, error}>}
 */
export const getPendingSyncItems = async (userId) => {
  try {
    const { data, error } = await supabase.rpc("get_pending_sync_items", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Erreur lors de la récupération des items de sync:", error);
      return { syncItems: [], error };
    }

    return { syncItems: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des items de sync:", error);
    return { syncItems: [], error };
  }
};

/**
 * Synchroniser les modifications offline avec le serveur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{synced, failed, conflicts, error}>}
 */
export const syncOfflineChanges = async (userId) => {
  try {
    const { syncItems, error: fetchError } = await getPendingSyncItems(userId);

    if (fetchError) {
      return { synced: 0, failed: 0, conflicts: 0, error: fetchError };
    }

    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const item of syncItems) {
      try {
        if (item.operation === "create") {
          // Créer la commande
          const { error } = await commandeToolkit.createCommande(item.local_data);

          if (error) {
            failed++;
            // Marquer comme failed
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "failed", error_message: error.message })
              .eq("id", item.id);
          } else {
            synced++;
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "completed", synced_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        } else if (item.operation === "update") {
          // Mettre à jour la commande
          const { collision, error } = await commandeToolkit.updateCommande(
            item.commande_id,
            item.local_data,
            item.local_version
          );

          if (collision) {
            conflicts++;
            // Marquer comme conflict
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "conflict" })
              .eq("id", item.id);
          } else if (error) {
            failed++;
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "failed", error_message: error.message })
              .eq("id", item.id);
          } else {
            synced++;
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "completed", synced_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        } else if (item.operation === "delete") {
          // Supprimer la commande
          const { error } = await commandeToolkit.deleteCommande(item.commande_id);

          if (error) {
            failed++;
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "failed", error_message: error.message })
              .eq("id", item.id);
          } else {
            synced++;
            await supabase
              .from("commandes_sync_queue")
              .update({ status: "completed", synced_at: new Date().toISOString() })
              .eq("id", item.id);
          }
        }
      } catch (itemError) {
        console.error("Erreur lors de la sync d'un item:", itemError);
        failed++;
      }
    }

    return { synced, failed, conflicts, error: null };
  } catch (error) {
    console.error("Exception lors de la synchronisation:", error);
    return { synced: 0, failed: 0, conflicts: 0, error };
  }
};

/**
 * Résoudre un conflit de synchronisation
 * @param {string} syncId - ID de l'item de sync
 * @param {string} strategy - Stratégie de résolution
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{result, error}>}
 */
export const resolveSyncConflict = async (syncId, strategy, userId) => {
  try {
    const { data, error } = await supabase.rpc("resolve_sync_conflict", {
      p_sync_id: syncId,
      p_resolution_strategy: strategy,
      p_user_id: userId,
    });

    if (error) {
      console.error("Erreur lors de la résolution du conflit:", error);
      return { result: null, error };
    }

    return { result: data, error: null };
  } catch (error) {
    console.error("Exception lors de la résolution du conflit:", error);
    return { result: null, error };
  }
};

// ============================================================================
// 3. HISTORIQUE DES MODIFICATIONS (AUDIT TRAIL)
// ============================================================================

/**
 * Récupérer l'historique d'une commande
 * @param {string} commandeId - ID de la commande
 * @returns {Promise<{history, error}>}
 */
export const getCommandeHistory = async (commandeId) => {
  try {
    const { data, error } = await supabase.rpc("get_commande_history", {
      p_commande_id: commandeId,
    });

    if (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
      return { history: [], error };
    }

    return { history: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération de l'historique:", error);
    return { history: [], error };
  }
};

/**
 * Restaurer une version précédente d'une commande
 * @param {string} historyId - ID de l'enregistrement d'historique
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{result, error}>}
 */
export const restoreCommandeVersion = async (historyId, userId) => {
  try {
    const { data, error } = await supabase.rpc("restore_commande_version", {
      p_history_id: historyId,
      p_current_user_id: userId,
    });

    if (error) {
      console.error("Erreur lors de la restauration:", error);
      return { result: null, error };
    }

    return { result: data, error: null };
  } catch (error) {
    console.error("Exception lors de la restauration:", error);
    return { result: null, error };
  }
};

/**
 * Comparer deux versions d'une commande
 * @param {Object} version1 - Première version
 * @param {Object} version2 - Deuxième version
 * @returns {Object} Différences entre les deux versions
 */
export const compareVersions = (version1, version2) => {
  const differences = [];

  const fields = [
    "type", "client", "contact_client", "statut_commande",
    "statut_livraison", "statut_paiement", "livreur",
    "date_livraison", "frais_livraison"
  ];

  fields.forEach(field => {
    if (JSON.stringify(version1[field]) !== JSON.stringify(version2[field])) {
      differences.push({
        field,
        old_value: version1[field],
        new_value: version2[field],
      });
    }
  });

  // Comparer les détails de commande
  if (JSON.stringify(version1.details_commandes) !== JSON.stringify(version2.details_commandes)) {
    differences.push({
      field: "details_commandes",
      old_value: version1.details_commandes,
      new_value: version2.details_commandes,
    });
  }

  return differences;
};

// ============================================================================
// 4. OPTIMISATION GÉOGRAPHIQUE AVEC POSTGIS
// ============================================================================

/**
 * Récupérer les commandes dans un rayon (optimisé PostGIS)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Rayon en km
 * @returns {Promise<{commandes, error}>}
 */
export const getCommandesInRadiusOptimized = async (lat, lng, radius) => {
  try {
    const { data, error } = await supabase.rpc("get_commandes_within_radius", {
      p_latitude: lat,
      p_longitude: lng,
      p_radius_km: radius,
    });

    if (error) {
      console.error("Erreur lors de la recherche géographique:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche géographique:", error);
    return { commandes: [], error };
  }
};

/**
 * Récupérer les N commandes les plus proches
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} limit - Nombre de commandes
 * @returns {Promise<{commandes, error}>}
 */
export const getNearestCommandes = async (lat, lng, limit = 10) => {
  try {
    const { data, error } = await supabase.rpc("get_nearest_commandes", {
      p_latitude: lat,
      p_longitude: lng,
      p_limit: limit,
    });

    if (error) {
      console.error("Erreur lors de la recherche des commandes proches:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche des commandes proches:", error);
    return { commandes: [], error };
  }
};

/**
 * Obtenir les clusters de livraison pour optimiser les tournées
 * @param {Date} date - Date de livraison
 * @param {number} clusterRadius - Rayon du cluster en km
 * @returns {Promise<{clusters, error}>}
 */
export const getDeliveryClusters = async (date, clusterRadius = 2.0) => {
  try {
    const { data, error } = await supabase.rpc("get_delivery_clusters", {
      p_date: date,
      p_cluster_radius_km: clusterRadius,
    });

    if (error) {
      console.error("Erreur lors du clustering:", error);
      return { clusters: [], error };
    }

    return { clusters: data || [], error: null };
  } catch (error) {
    console.error("Exception lors du clustering:", error);
    return { clusters: [], error };
  }
};

/**
 * Obtenir la zone de couverture des livraisons
 * @param {Date} date - Date
 * @returns {Promise<{coverage, error}>}
 */
export const getDeliveryCoverageArea = async (date) => {
  try {
    const { data, error } = await supabase.rpc("get_delivery_coverage_area", {
      p_date: date,
    });

    if (error) {
      console.error("Erreur lors du calcul de couverture:", error);
      return { coverage: null, error };
    }

    return { coverage: data, error: null };
  } catch (error) {
    console.error("Exception lors du calcul de couverture:", error);
    return { coverage: null, error };
  }
};

// ============================================================================
// 5. VALIDATION CÔTÉ SERVEUR
// ============================================================================

/**
 * Valider une commande côté serveur avant de la sauvegarder
 * @param {Object} commandeData - Données de la commande
 * @returns {Promise<{isValid, errors, warnings}>}
 */
export const validateCommandeServer = async (commandeData) => {
  try {
    const { data, error } = await supabase.rpc("validate_commande_data", {
      p_commande_data: commandeData,
    });

    if (error) {
      console.error("Erreur lors de la validation serveur:", error);
      return { isValid: false, errors: [error.message], warnings: [] };
    }

    return {
      isValid: data.is_valid,
      errors: data.errors || [],
      warnings: data.warnings || [],
    };
  } catch (error) {
    console.error("Exception lors de la validation serveur:", error);
    return { isValid: false, errors: [error.message], warnings: [] };
  }
};

/**
 * Vérifier si un utilisateur peut modifier une commande
 * @param {string} commandeId - ID de la commande
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{canModify, error}>}
 */
export const canUserModifyCommande = async (commandeId, userId) => {
  try {
    const { data, error } = await supabase.rpc("can_modify_commande", {
      p_commande_id: commandeId,
      p_user_id: userId,
    });

    if (error) {
      console.error("Erreur lors de la vérification des permissions:", error);
      return { canModify: false, error };
    }

    return { canModify: data, error: null };
  } catch (error) {
    console.error("Exception lors de la vérification des permissions:", error);
    return { canModify: false, error };
  }
};

// ============================================================================
// 6. ANALYTICS ET RAPPORTS
// ============================================================================

/**
 * Rafraîchir toutes les vues matérialisées d'analytics
 * @returns {Promise<{success, message, error}>}
 */
export const refreshAnalyticsViews = async () => {
  try {
    const { data, error } = await supabase.rpc("refresh_all_analytics_views");

    if (error) {
      console.error("Erreur lors du rafraîchissement des vues:", error);
      return { success: false, message: null, error };
    }

    return { success: true, message: data, error: null };
  } catch (error) {
    console.error("Exception lors du rafraîchissement des vues:", error);
    return { success: false, message: null, error };
  }
};

/**
 * Obtenir un rapport analytique complet
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {Promise<{report, error}>}
 */
export const getAnalyticsReport = async (startDate, endDate) => {
  try {
    const { data, error} = await supabase.rpc("get_analytics_report", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("Erreur lors de la génération du rapport:", error);
      return { report: null, error };
    }

    return { report: data, error: null };
  } catch (error) {
    console.error("Exception lors de la génération du rapport:", error);
    return { report: null, error };
  }
};

/**
 * Obtenir les statistiques quotidiennes
 * @returns {Promise<{stats, error}>}
 */
export const getDailyStats = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_daily_commandes_stats")
      .select("*")
      .order("date_jour", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erreur lors de la récupération des stats quotidiennes:", error);
      return { stats: [], error };
    }

    return { stats: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des stats quotidiennes:", error);
    return { stats: [], error };
  }
};

/**
 * Obtenir le top des produits vendus
 * @param {number} limit - Nombre de produits
 * @returns {Promise<{products, error}>}
 */
export const getTopProducts = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from("mv_top_products")
      .select("*")
      .limit(limit);

    if (error) {
      console.error("Erreur lors de la récupération du top produits:", error);
      return { products: [], error };
    }

    return { products: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération du top produits:", error);
    return { products: [], error };
  }
};

/**
 * Obtenir la performance des vendeurs
 * @returns {Promise<{performance, error}>}
 */
export const getVendeursPerformance = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_vendeurs_performance")
      .select("*")
      .order("ca_total", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération de la performance vendeurs:", error);
      return { performance: [], error };
    }

    return { performance: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération de la performance vendeurs:", error);
    return { performance: [], error };
  }
};

/**
 * Obtenir la performance des livreurs
 * @returns {Promise<{performance, error}>}
 */
export const getLivreursPerformance = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_livreurs_performance")
      .select("*")
      .order("livraisons_completees", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération de la performance livreurs:", error);
      return { performance: [], error };
    }

    return { performance: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération de la performance livreurs:", error);
    return { performance: [], error };
  }
};

/**
 * Obtenir les statistiques géographiques
 * @returns {Promise<{stats, error}>}
 */
export const getGeographicStats = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_geographic_stats")
      .select("*")
      .order("ca_total", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des stats géographiques:", error);
      return { stats: [], error };
    }

    return { stats: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des stats géographiques:", error);
    return { stats: [], error };
  }
};

/**
 * Obtenir les statistiques des promotions
 * @returns {Promise<{stats, error}>}
 */
export const getPromotionsStats = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_promotions_stats")
      .select("*")
      .order("nombre_utilisations", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des stats promotions:", error);
      return { stats: [], error };
    }

    return { stats: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des stats promotions:", error);
    return { stats: [], error };
  }
};

/**
 * Obtenir les patterns horaires
 * @returns {Promise<{patterns, error}>}
 */
export const getHourlyPatterns = async () => {
  try {
    const { data, error } = await supabase
      .from("mv_hourly_patterns")
      .select("*")
      .order("heure", { ascending: true });

    if (error) {
      console.error("Erreur lors de la récupération des patterns horaires:", error);
      return { patterns: [], error };
    }

    return { patterns: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des patterns horaires:", error);
    return { patterns: [], error };
  }
};

// ============================================================================
// 7. PRÉDICTIONS ML (SIMPLE)
// ============================================================================

/**
 * Prédire le volume de commandes pour une période
 * Utilise une moyenne mobile simple (à améliorer avec un vrai modèle ML)
 * @param {number} daysAhead - Nombre de jours à prédire
 * @returns {Promise<{predictions, error}>}
 */
export const predictOrderVolume = async (daysAhead = 7) => {
  try {
    // Récupérer les stats des 30 derniers jours
    const { stats, error } = await getDailyStats();

    if (error) {
      return { predictions: [], error };
    }

    // Calculer la moyenne mobile sur 7 jours
    const window = 7;
    const predictions = [];

    for (let i = 0; i < daysAhead; i++) {
      const recentStats = stats.slice(0, window);
      const avgCommandes = recentStats.reduce((sum, s) => sum + s.total_commandes, 0) / recentStats.length;
      const avgCA = recentStats.reduce((sum, s) => sum + (s.ca_total || 0), 0) / recentStats.length;

      const predictionDate = new Date();
      predictionDate.setDate(predictionDate.getDate() + i + 1);

      predictions.push({
        date: predictionDate.toISOString().split("T")[0],
        predicted_commandes: Math.round(avgCommandes),
        predicted_ca: Math.round(avgCA),
        confidence: 0.7, // Confiance arbitraire (à améliorer)
      });
    }

    return { predictions, error: null };
  } catch (error) {
    console.error("Exception lors de la prédiction du volume:", error);
    return { predictions: [], error };
  }
};

/**
 * Prédire le délai moyen de livraison
 * @returns {Promise<{prediction, error}>}
 */
export const predictDeliveryTime = async () => {
  try {
    const { performance, error } = await getLivreursPerformance();

    if (error) {
      return { prediction: null, error };
    }

    // Calculer le délai moyen basé sur la performance des livreurs
    const totalLivraisons = performance.reduce((sum, p) => sum + (p.livraisons_completees || 0), 0);
    const avgDelai = performance.reduce((sum, p) => {
      return sum + ((p.delai_moyen_minutes || 0) * (p.livraisons_completees || 0));
    }, 0) / totalLivraisons;

    return {
      prediction: {
        avg_delivery_time_minutes: Math.round(avgDelai),
        on_time_rate: performance.reduce((sum, p) => {
          const total = p.nombre_livraisons || 1;
          const onTime = p.livraisons_a_temps || 0;
          return sum + (onTime / total);
        }, 0) / performance.length,
      },
      error: null,
    };
  } catch (error) {
    console.error("Exception lors de la prédiction du délai:", error);
    return { prediction: null, error };
  }
};

// ============================================================================
// 8. GÉNÉRATION DE DOCUMENTS (EXCEL, FACTURES)
// ============================================================================

/**
 * Générer un fichier Excel avec les ventes d'une période
 * Note: Nécessite l'installation de la bibliothèque 'xlsx' (npm install xlsx)
 * @param {Array} commandes - Liste des commandes
 * @param {string} filename - Nom du fichier
 * @returns {void}
 */
export const generateExcelReport = async (commandes, filename = null) => {
  try {
    // Dynamically import xlsx to avoid bundling if not used
    const XLSX = await import("xlsx");

    // Préparer les données pour Excel
    const data = commandes.map((commande) => ({
      "ID": commande.id,
      "Date": new Date(commande.created_at).toLocaleDateString("fr-FR"),
      "Type": commande.type,
      "Client": commande.client,
      "Contact": commande.contact_client,
      "Statut": commande.statut_commande,
      "Livraison": commande.statut_livraison,
      "Paiement": commande.statut_paiement,
      "Total": commande.details_paiement?.total || 0,
      "Après Réduction": commande.details_paiement?.total_apres_reduction || 0,
      "MoMo": commande.details_paiement?.momo || 0,
      "Cash": commande.details_paiement?.cash || 0,
      "Autre": commande.details_paiement?.autre || 0,
      "Frais Livraison": commande.frais_livraison || 0,
    }));

    // Créer un classeur Excel
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes");

    // Ajouter un récapitulatif
    const stats = commandeToolkit.getCommandesStats(commandes);
    const summaryData = [
      { "Métrique": "Total Commandes", "Valeur": stats.total },
      { "Métrique": "En Cours", "Valeur": stats.en_cours },
      { "Métrique": "Terminées", "Valeur": stats.terminees },
      { "Métrique": "Annulées", "Valeur": stats.annulees },
      { "Métrique": "Livraisons", "Valeur": stats.livraisons },
      { "Métrique": "Sur Place", "Valeur": stats.sur_place },
      { "Métrique": "CA Total", "Valeur": stats.montant_total },
      { "Métrique": "Montant Payé", "Valeur": stats.montant_paye },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Récapitulatif");

    // Télécharger le fichier
    const finalFilename = filename || `rapport_ventes_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, finalFilename);

    return { success: true, error: null };
  } catch (error) {
    console.error("Erreur lors de la génération Excel:", error);
    return { success: false, error };
  }
};

/**
 * Générer une facture en format texte
 * @param {Object} commande - Commande
 * @returns {string} Facture en texte
 */
export const generateInvoiceText = (commande) => {
  const invoice = [];

  invoice.push("═══════════════════════════════════════════════");
  invoice.push("           FACTURE - LES SANDWICHS DU DOCTEUR");
  invoice.push("═══════════════════════════════════════════════");
  invoice.push("");
  invoice.push(`Facture N°: ${commande.id}`);
  invoice.push(`Date: ${new Date(commande.created_at).toLocaleString("fr-FR")}`);
  invoice.push(`Type: ${commande.type === "livraison" ? "Livraison" : "Sur Place"}`);
  invoice.push("");
  invoice.push("───────────────────────────────────────────────");
  invoice.push("CLIENT");
  invoice.push("───────────────────────────────────────────────");
  invoice.push(`Nom: ${commande.client}`);
  if (commande.contact_client) {
    invoice.push(`Téléphone: ${commande.contact_client}`);
  }
  if (commande.lieu_livraison && commande.type === "livraison") {
    const lieu = commande.lieu_livraison;
    invoice.push(`Adresse: ${lieu.quartier || ""}, ${lieu.commune || ""}`);
  }
  invoice.push("");
  invoice.push("───────────────────────────────────────────────");
  invoice.push("DÉTAILS DE LA COMMANDE");
  invoice.push("───────────────────────────────────────────────");
  invoice.push(
    `${"Article".padEnd(30)} ${"Qté".padEnd(5)} ${"P.U.".padEnd(10)} ${"Total".padEnd(10)}`
  );
  invoice.push("───────────────────────────────────────────────");

  (commande.details_commandes || []).forEach((item) => {
    const nom = item.item.padEnd(30);
    const qte = String(item.quantite).padEnd(5);
    const pu = `${item.prix_unitaire} F`.padEnd(10);
    const total = `${item.quantite * item.prix_unitaire} F`.padEnd(10);
    invoice.push(`${nom} ${qte} ${pu} ${total}`);
  });

  invoice.push("───────────────────────────────────────────────");

  const total = commande.details_paiement?.total || 0;
  const frais = commande.frais_livraison || 0;
  const sousTotal = total - frais;

  invoice.push(`Sous-total: ${sousTotal} F`);
  if (frais > 0) {
    invoice.push(`Frais de livraison: ${frais} F`);
  }

  if (commande.promotion) {
    const reduction = commande.promotion.montant_reduction || 0;
    invoice.push(`Réduction (${commande.promotion.code}): -${reduction} F`);
  }

  const totalFinal = commande.details_paiement?.total_apres_reduction || total;
  invoice.push("");
  invoice.push(`TOTAL À PAYER: ${totalFinal} F`);
  invoice.push("");

  // Détails du paiement
  const paiement = commande.details_paiement || {};
  if (paiement.momo > 0) invoice.push(`MoMo: ${paiement.momo} F`);
  if (paiement.cash > 0) invoice.push(`Cash: ${paiement.cash} F`);
  if (paiement.autre > 0) invoice.push(`Autre: ${paiement.autre} F`);

  invoice.push("");
  invoice.push(`Statut: ${commande.statut_paiement === "payee" ? "PAYÉE" : "NON PAYÉE"}`);
  invoice.push("");
  invoice.push("═══════════════════════════════════════════════");
  invoice.push("         Merci de votre confiance!");
  invoice.push("═══════════════════════════════════════════════");

  return invoice.join("\n");
};

/**
 * Télécharger une facture en format texte
 * @param {Object} commande - Commande
 * @param {string} filename - Nom du fichier
 */
export const downloadInvoiceText = (commande, filename = null) => {
  const invoice = generateInvoiceText(commande);
  const finalFilename = filename || `facture_${commande.id}.txt`;

  const blob = new Blob([invoice], { type: "text/plain;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", finalFilename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Générer une facture en format PDF
 * Note: Nécessite l'installation de 'jspdf' et 'jspdf-autotable' (npm install jspdf jspdf-autotable)
 * @param {Object} commande - Commande
 * @param {string} filename - Nom du fichier
 */
export const generateInvoicePDF = async (commande, filename = null) => {
  try {
    // Dynamically import jsPDF
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();

    // En-tête
    doc.setFontSize(20);
    doc.text("FACTURE", 105, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("Les Sandwichs du Docteur", 105, 30, { align: "center" });

    // Informations facture
    doc.setFontSize(10);
    doc.text(`Facture N°: ${commande.id.substring(0, 8)}`, 20, 50);
    doc.text(`Date: ${new Date(commande.created_at).toLocaleDateString("fr-FR")}`, 20, 56);
    doc.text(`Type: ${commande.type === "livraison" ? "Livraison" : "Sur Place"}`, 20, 62);

    // Informations client
    doc.text("Client:", 120, 50);
    doc.text(commande.client, 120, 56);
    if (commande.contact_client) {
      doc.text(`Tel: ${commande.contact_client}`, 120, 62);
    }

    // Table des items
    const tableData = (commande.details_commandes || []).map((item) => [
      item.item,
      item.quantite,
      `${item.prix_unitaire} F`,
      `${item.quantite * item.prix_unitaire} F`,
    ]);

    doc.autoTable({
      startY: 75,
      head: [["Article", "Qté", "Prix Unitaire", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [164, 22, 36] }, // Couleur thème
    });

    // Totaux
    let finalY = doc.lastAutoTable.finalY + 10;
    const total = commande.details_paiement?.total || 0;
    const frais = commande.frais_livraison || 0;

    doc.text(`Sous-total: ${total - frais} F`, 140, finalY);
    finalY += 6;

    if (frais > 0) {
      doc.text(`Frais de livraison: ${frais} F`, 140, finalY);
      finalY += 6;
    }

    if (commande.promotion) {
      const reduction = commande.promotion.montant_reduction || 0;
      doc.text(`Réduction: -${reduction} F`, 140, finalY);
      finalY += 6;
    }

    const totalFinal = commande.details_paiement?.total_apres_reduction || total;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`TOTAL: ${totalFinal} F`, 140, finalY + 4);

    // Pied de page
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Merci de votre confiance!", 105, 280, { align: "center" });

    // Télécharger
    const finalFilename = filename || `facture_${commande.id}.pdf`;
    doc.save(finalFilename);

    return { success: true, error: null };
  } catch (error) {
    console.error("Erreur lors de la génération PDF:", error);
    return { success: false, error };
  }
};

// ============================================================================
// 9. RECHERCHE FULL-TEXT POSTGRESQL
// ============================================================================

/**
 * Rechercher des commandes avec recherche full-text
 * @param {string} searchTerm - Terme de recherche
 * @returns {Promise<{commandes, error}>}
 */
export const searchCommandes = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === "") {
      return { commandes: [], error: null };
    }

    // Recherche dans plusieurs champs
    const { data, error } = await supabase
      .from("commandes")
      .select("*")
      .or(
        `client.ilike.%${searchTerm}%,` +
        `contact_client.ilike.%${searchTerm}%,` +
        `instructions_livraison.ilike.%${searchTerm}%`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Erreur lors de la recherche:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche:", error);
    return { commandes: [], error };
  }
};

/**
 * Rechercher des commandes par ID (partiel)
 * @param {string} idPartial - Partie de l'ID
 * @returns {Promise<{commandes, error}>}
 */
export const searchCommandesById = async (idPartial) => {
  try {
    const { data, error } = await supabase
      .from("commandes")
      .select("*")
      .ilike("id", `%${idPartial}%`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erreur lors de la recherche par ID:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche par ID:", error);
    return { commandes: [], error };
  }
};

/**
 * Recherche avancée avec filtres multiples
 * @param {Object} filters - Filtres de recherche
 * @returns {Promise<{commandes, error}>}
 */
export const advancedSearch = async (filters) => {
  try {
    let query = supabase.from("commandes").select("*");

    // Filtre par texte
    if (filters.searchTerm) {
      query = query.or(
        `client.ilike.%${filters.searchTerm}%,` +
        `contact_client.ilike.%${filters.searchTerm}%`
      );
    }

    // Filtre par type
    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    // Filtre par statut commande
    if (filters.statut_commande) {
      query = query.eq("statut_commande", filters.statut_commande);
    }

    // Filtre par statut livraison
    if (filters.statut_livraison) {
      query = query.eq("statut_livraison", filters.statut_livraison);
    }

    // Filtre par statut paiement
    if (filters.statut_paiement) {
      query = query.eq("statut_paiement", filters.statut_paiement);
    }

    // Filtre par date
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    // Filtre par vendeur
    if (filters.vendeur) {
      query = query.eq("vendeur", filters.vendeur);
    }

    // Filtre par livreur
    if (filters.livreur) {
      query = query.eq("livreur", filters.livreur);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Erreur lors de la recherche avancée:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche avancée:", error);
    return { commandes: [], error };
  }
};

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default {
  // Notifications
  requestNotificationPermission,
  sendLocalNotification,
  createNotification,
  getUserNotifications,
  subscribeToNotifications,

  // Synchronisation offline
  addToSyncQueue,
  getPendingSyncItems,
  syncOfflineChanges,
  resolveSyncConflict,

  // Historique
  getCommandeHistory,
  restoreCommandeVersion,
  compareVersions,

  // PostGIS
  getCommandesInRadiusOptimized,
  getNearestCommandes,
  getDeliveryClusters,
  getDeliveryCoverageArea,

  // Validation serveur
  validateCommandeServer,
  canUserModifyCommande,

  // Analytics
  refreshAnalyticsViews,
  getAnalyticsReport,
  getDailyStats,
  getTopProducts,
  getVendeursPerformance,
  getLivreursPerformance,
  getGeographicStats,
  getPromotionsStats,
  getHourlyPatterns,

  // Prédictions
  predictOrderVolume,
  predictDeliveryTime,

  // Génération documents
  generateExcelReport,
  generateInvoiceText,
  downloadInvoiceText,
  generateInvoicePDF,

  // Recherche
  searchCommandes,
  searchCommandesById,
  advancedSearch,
};
