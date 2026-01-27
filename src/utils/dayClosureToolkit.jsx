/**
 * dayClosureToolkit.jsx
 * Utilitaires pour la gestion des clôtures journalières
 * Architecture MVC - Couche Model/Data Access
 */

import { supabase } from "@/config/supabase";

// =====================================================
// RÉCUPÉRATION DES DONNÉES
// =====================================================

/**
 * Récupère toutes les commandes d'une journée donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<Array>} Commandes du jour
 */
export const getCommandesByDate = async (date) => {
  try {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error} = await supabase
      .from("commandes")
      .select(`
        *,
        vendeur_info:users!vendeur(id, nom, prenoms),
        point_de_vente_info:emplacements!point_de_vente(id, nom)
      `)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur getCommandesByDate:", error);
    throw error;
  }
};

/**
 * Récupère les détails de menus pour calculer les produits les plus vendus
 * @param {Array} commandes - Liste des commandes
 * @returns {Promise<Map>} Map des produits avec leurs informations
 */
export const getMenusInfo = async (commandesAvecDetails) => {
  try {
    // Extraire tous les menu_id uniques
    const menuIds = new Set();
    commandesAvecDetails.forEach((commande) => {
      if (commande.details_commandes && Array.isArray(commande.details_commandes)) {
        commande.details_commandes.forEach((detail) => {
          if (detail.menu_id) {
            menuIds.add(detail.menu_id);
          }
        });
      }
    });

    if (menuIds.size === 0) return new Map();

    // Récupérer les infos des menus
    const { data, error } = await supabase
      .from("menus")
      .select("id, nom")
      .in("id", Array.from(menuIds));

    if (error) throw error;

    // Créer une Map pour accès rapide
    const menusMap = new Map();
    data?.forEach((menu) => {
      menusMap.set(menu.id, menu);
    });

    return menusMap;
  } catch (error) {
    console.error("Erreur getMenusInfo:", error);
    return new Map();
  }
};

/**
 * Récupère la clôture d'une journée si elle existe
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<Object|null>} Données de clôture ou null
 */
export const getDayClosureByDate = async (date) => {
  try {
    const { data, error } = await supabase
      .from("days")
      .select(`
        *,
        cloture_par_info:users!days_cloture_par_fkey (id, nom, prenoms),
        meilleur_point_vente_info:emplacements!days_meilleur_point_vente_id_fkey (id, nom),
        meilleur_vendeur_info:users!days_meilleur_vendeur_id_fkey (id, nom, prenoms),
        meilleur_produit_info:menus!days_meilleur_produit_id_fkey (id, nom)
      `)
      .eq("jour", date)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur getDayClosureByDate:", error);
    throw error;
  }
};

/**
 * Récupère toutes les clôtures avec pagination
 * @param {number} limit - Nombre de résultats
 * @param {number} offset - Décalage
 * @returns {Promise<Array>} Liste des clôtures
 */
export const getAllDayClosures = async (limit = 30, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from("days")
      .select(`
        *,
        cloture_par_info:users!days_cloture_par_fkey (id, nom, prenoms)
      `)
      .order("jour", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur getAllDayClosures:", error);
    throw error;
  }
};

// =====================================================
// CALCULS DES MÉTRIQUES
// =====================================================

/**
 * Calcule toutes les métriques d'une journée
 * @param {Array} commandes - Commandes du jour
 * @returns {Promise<Object>} Objet contenant toutes les métriques
 */
export const calculateDayMetrics = async (commandes) => {
  if (!commandes || commandes.length === 0) {
    return getEmptyMetrics();
  }

  // Récupérer les infos des menus pour le calcul du meilleur produit
  const menusMap = await getMenusInfo(commandes);

  // Métriques de base
  const nombreVentesTotal = commandes.length;

  // Temporalité
  const timestamps = commandes.map((c) => new Date(c.created_at));
  const ouverture = new Date(Math.min(...timestamps));
  const fermeture = new Date(Math.max(...timestamps));
  const dureeOuvertureMinutes = Math.round((fermeture - ouverture) / (1000 * 60));

  // Métriques par type de commande
  const nombreVentesSurPlace = commandes.filter((c) => c.type === "sur-place").length;
  const nombreVentesLivraison = commandes.filter((c) => c.type === "livraison").length;
  const nombreVentesEmporter = commandes.filter((c) => c.type === "emporter" || c.type === "à emporter").length;

  // Métriques de paiement
  const paiementStats = calculatePaiementMetrics(commandes);

  // Chiffre d'affaires (calculé depuis details_paiement)
  const chiffreAffaires = commandes.reduce((sum, c) => {
    const paiements = c.details_paiement || {};
    const total = (paiements.momo || 0) + (paiements.cash || 0) + (paiements.autre || 0);
    return sum + total;
  }, 0);

  // Panier moyen et ticket moyen
  const panierMoyen = nombreVentesTotal > 0 ? chiffreAffaires / nombreVentesTotal : 0;
  const ticketMoyen = panierMoyen; // Même chose dans ce contexte

  // Cadence de vente (ventes par heure)
  const cadenceVente =
    dureeOuvertureMinutes > 0 ? nombreVentesTotal / (dureeOuvertureMinutes / 60) : 0;

  // Taux de livraison
  const tauxLivraison =
    nombreVentesTotal > 0 ? (nombreVentesLivraison / nombreVentesTotal) * 100 : 0;

  // Meilleur produit
  const meilleurProduit = findBestProduct(commandes, menusMap);

  // Variété de produits
  const produitsDistincts = countDistinctProducts(commandes);

  // Promotions
  const promotionStats = calculatePromotionMetrics(commandes);

  // Points de vente
  const pointsVenteStats = calculatePointsVenteMetrics(commandes);

  // Vendeurs
  const vendeursStats = calculateVendeursMetrics(commandes);

  // Clients
  const clientsStats = calculateClientsMetrics(commandes);

  // Heure de pointe
  const heurePointeStats = calculatePeakHours(commandes);

  // Statuts des commandes
  const statutsStats = calculateStatutsMetrics(commandes);

  // Temps moyens
  const tempsStats = calculateTempsMetrics(commandes);

  return {
    // Temporalité
    jour: commandes[0]?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
    ouverture: formatTime(ouverture),
    fermeture: formatTime(fermeture),
    duree_ouverture_minutes: dureeOuvertureMinutes,

    // Ventes globales
    nombre_ventes_total: nombreVentesTotal,
    nombre_ventes_sur_place: nombreVentesSurPlace,
    nombre_ventes_livraison: nombreVentesLivraison,
    nombre_ventes_emporter: nombreVentesEmporter,

    // Paiements
    ...paiementStats,

    // Performance
    chiffre_affaires: Math.round(chiffreAffaires * 100) / 100,
    panier_moyen: Math.round(panierMoyen * 100) / 100,
    ticket_moyen: Math.round(ticketMoyen * 100) / 100,
    cadence_vente: Math.round(cadenceVente * 100) / 100,
    taux_livraison: Math.round(tauxLivraison * 100) / 100,

    // Produits
    meilleur_produit_id: meilleurProduit?.id || null,
    meilleur_produit_nom: meilleurProduit?.nom || null,
    meilleur_produit_quantite: meilleurProduit?.quantite || 0,
    nombre_produits_distincts: produitsDistincts,

    // Promotions
    ...promotionStats,

    // Points de vente
    ...pointsVenteStats,

    // Vendeurs
    ...vendeursStats,

    // Clients
    ...clientsStats,

    // Heure de pointe
    ...heurePointeStats,

    // Statuts
    ...statutsStats,

    // Temps
    ...tempsStats,
  };
};

/**
 * Calcule les métriques de paiement
 */
const calculatePaiementMetrics = (commandes) => {
  let nombrePaiementsMomo = 0;
  let nombrePaiementsCash = 0;
  let nombrePaiementsAutre = 0;
  let nombrePaiementsMixtes = 0;
  let montantPercuMomo = 0;
  let montantPercuCash = 0;
  let montantPercuAutre = 0;

  commandes.forEach((commande) => {
    const paiements = commande.details_paiement || {};
    const modesActifs = Object.keys(paiements).filter((mode) => paiements[mode] > 0);

    // Paiements mixtes (plusieurs modes)
    if (modesActifs.length > 1) {
      nombrePaiementsMixtes++;
    }

    // Compter chaque mode
    if (paiements.momo > 0) {
      nombrePaiementsMomo++;
      montantPercuMomo += paiements.momo;
    }
    if (paiements.cash > 0) {
      nombrePaiementsCash++;
      montantPercuCash += paiements.cash;
    }
    if (paiements.autre > 0) {
      nombrePaiementsAutre++;
      montantPercuAutre += paiements.autre;
    }
  });

  return {
    nombre_paiements_momo: nombrePaiementsMomo,
    nombre_paiements_cash: nombrePaiementsCash,
    nombre_paiements_autre: nombrePaiementsAutre,
    nombre_paiements_mixtes: nombrePaiementsMixtes,
    montant_percu_momo: Math.round(montantPercuMomo * 100) / 100,
    montant_percu_cash: Math.round(montantPercuCash * 100) / 100,
    montant_percu_autre: Math.round(montantPercuAutre * 100) / 100,
  };
};

/**
 * Trouve le produit le plus vendu
 * @param {Array} commandes - Liste des commandes
 * @param {Map} menusMap - Map des menus avec leurs infos
 */
const findBestProduct = (commandes, menusMap) => {
  const productCounts = {};

  commandes.forEach((commande) => {
    const details = commande.details_commandes;
    if (!details || !Array.isArray(details)) return;

    details.forEach((detail) => {
      const menuId = detail.menu_id;
      if (!menuId) return;

      if (!productCounts[menuId]) {
        const menuInfo = menusMap.get(menuId);
        productCounts[menuId] = {
          id: menuId,
          nom: menuInfo?.nom || detail.item || "Produit inconnu",
          quantite: 0,
        };
      }
      productCounts[menuId].quantite += detail.quantite || 1;
    });
  });

  const products = Object.values(productCounts);
  if (products.length === 0) return null;

  return products.reduce((best, current) =>
    current.quantite > best.quantite ? current : best
  );
};

/**
 * Compte le nombre de produits distincts vendus
 */
const countDistinctProducts = (commandes) => {
  const uniqueProducts = new Set();

  commandes.forEach((commande) => {
    const details = commande.details_commandes;
    if (!details || !Array.isArray(details)) return;

    details.forEach((detail) => {
      if (detail.menu_id) {
        uniqueProducts.add(detail.menu_id);
      }
    });
  });

  return uniqueProducts.size;
};

/**
 * Calcule les métriques de promotions
 */
const calculatePromotionMetrics = (commandes) => {
  let commandesAvecPromo = 0;
  let montantTotalRemises = 0;

  commandes.forEach((c) => {
    const promotion = c.promotion;
    if (promotion && typeof promotion === "object") {
      commandesAvecPromo++;

      // Calculer le montant de la remise
      const paiements = c.details_paiement || {};
      const total = (paiements.momo || 0) + (paiements.cash || 0) + (paiements.autre || 0);

      if (promotion.type === "pourcentage" && promotion.valeur) {
        montantTotalRemises += (total * promotion.valeur) / 100;
      } else if (promotion.type === "fixe" && promotion.valeur) {
        montantTotalRemises += promotion.valeur;
      }
    }
  });

  return {
    nombre_promotions_utilisees: commandesAvecPromo,
    montant_total_remises: Math.round(montantTotalRemises * 100) / 100,
  };
};

/**
 * Calcule les métriques des points de vente
 */
const calculatePointsVenteMetrics = (commandes) => {
  const pointsVenteStats = {};

  commandes.forEach((commande) => {
    const pdvId = commande.point_de_vente;
    if (!pdvId) return;

    if (!pointsVenteStats[pdvId]) {
      pointsVenteStats[pdvId] = {
        id: pdvId,
        nom: commande.point_de_vente_info?.nom || "PDV inconnu",
        ca: 0,
        ventes: 0,
      };
    }

    const paiements = commande.details_paiement || {};
    const total = (paiements.momo || 0) + (paiements.cash || 0) + (paiements.autre || 0);
    pointsVenteStats[pdvId].ca += total;
    pointsVenteStats[pdvId].ventes++;
  });

  const pointsVenteArray = Object.values(pointsVenteStats);
  const meilleurPdv =
    pointsVenteArray.length > 0
      ? pointsVenteArray.reduce((best, current) => (current.ca > best.ca ? current : best))
      : null;

  return {
    nombre_points_vente_actifs: pointsVenteArray.length,
    meilleur_point_vente_id: meilleurPdv?.id || null,
    meilleur_point_vente_nom: meilleurPdv?.nom || null,
    meilleur_point_vente_ca: meilleurPdv ? Math.round(meilleurPdv.ca * 100) / 100 : 0,
  };
};

/**
 * Calcule les métriques des vendeurs
 */
const calculateVendeursMetrics = (commandes) => {
  const vendeursStats = {};

  commandes.forEach((commande) => {
    const vendeurId = commande.vendeur;
    if (!vendeurId) return;

    if (!vendeursStats[vendeurId]) {
      const vendeurInfo = commande.vendeur_info;
      vendeursStats[vendeurId] = {
        id: vendeurId,
        nom: vendeurInfo
          ? `${vendeurInfo.prenoms || ""} ${vendeurInfo.nom || ""}`.trim()
          : "Vendeur inconnu",
        ventes: 0,
      };
    }
    vendeursStats[vendeurId].ventes++;
  });

  const vendeursArray = Object.values(vendeursStats);
  const meilleurVendeur =
    vendeursArray.length > 0
      ? vendeursArray.reduce((best, current) => (current.ventes > best.ventes ? current : best))
      : null;

  return {
    nombre_vendeurs_actifs: vendeursArray.length,
    meilleur_vendeur_id: meilleurVendeur?.id || null,
    meilleur_vendeur_nom: meilleurVendeur?.nom || null,
    meilleur_vendeur_ventes: meilleurVendeur?.ventes || 0,
  };
};

/**
 * Calcule les métriques clients
 */
const calculateClientsMetrics = (commandes) => {
  const clientCounts = {};

  commandes.forEach((commande) => {
    const clientId = commande.client || "anonyme";
    clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
  });

  const clientsUniques = Object.keys(clientCounts).length;
  const clientsReguliers = Object.values(clientCounts).filter((count) => count > 1).length;
  const tauxClientsReguliers =
    clientsUniques > 0 ? (clientsReguliers / clientsUniques) * 100 : 0;

  return {
    nombre_clients_uniques: clientsUniques,
    taux_clients_reguliers: Math.round(tauxClientsReguliers * 100) / 100,
  };
};

/**
 * Calcule l'heure de pointe
 */
const calculatePeakHours = (commandes) => {
  const hourCounts = {};

  commandes.forEach((commande) => {
    const hour = new Date(commande.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  if (Object.keys(hourCounts).length === 0) {
    return {
      heure_pointe_debut: null,
      heure_pointe_fin: null,
      ventes_heure_pointe: 0,
    };
  }

  const peakHour = Object.entries(hourCounts).reduce(
    (max, [hour, count]) => (count > max.count ? { hour: parseInt(hour), count } : max),
    { hour: 0, count: 0 }
  );

  return {
    heure_pointe_debut: `${peakHour.hour.toString().padStart(2, "0")}:00:00`,
    heure_pointe_fin: `${peakHour.hour.toString().padStart(2, "0")}:59:59`,
    ventes_heure_pointe: peakHour.count,
  };
};

/**
 * Calcule les métriques de statuts
 */
const calculateStatutsMetrics = (commandes) => {
  const statuts = {
    annulees: 0,
    en_cours: 0,
    livrees: 0,
    terminees: 0,
  };

  commandes.forEach((commande) => {
    const statutCommande = commande.statut_commande?.toLowerCase();
    const statutLivraison = commande.statut_livraison?.toLowerCase();

    // Statut de commande
    if (statutCommande === "annulee") statuts.annulees++;
    else if (statutCommande === "en_cours") statuts.en_cours++;
    else if (statutCommande === "terminee") statuts.terminees++;

    // Statut de livraison pour les commandes livrées
    if (statutLivraison === "livree") statuts.livrees++;
  });

  const commandesCompletees = statuts.terminees + statuts.livrees;
  const tauxCompletion =
    commandes.length > 0 ? (commandesCompletees / commandes.length) * 100 : 0;

  return {
    nombre_commandes_annulees: statuts.annulees,
    nombre_commandes_en_preparation: statuts.en_cours,
    nombre_commandes_livrees: statuts.livrees,
    nombre_commandes_retirees: statuts.terminees - statuts.livrees, // Terminées mais pas livrées
    taux_completion: Math.round(tauxCompletion * 100) / 100,
  };
};

/**
 * Calcule les temps moyens
 */
const calculateTempsMetrics = (commandes) => {
  let totalTempsPreparation = 0;
  let nombreCommandesAvecTempsPrep = 0;
  let totalTempsLivraison = 0;
  let nombreCommandesAvecTempsLivr = 0;

  commandes.forEach((commande) => {
    // Temps de préparation
    if (commande.created_at && commande.updated_at) {
      const debut = new Date(commande.created_at);
      const fin = new Date(commande.updated_at);
      const tempsMinutes = (fin - debut) / (1000 * 60);
      if (tempsMinutes > 0 && tempsMinutes < 1440) {
        // Max 24h
        totalTempsPreparation += tempsMinutes;
        nombreCommandesAvecTempsPrep++;
      }
    }

    // Temps de livraison
    if (commande.heure_livraison && commande.heure_reelle_livraison) {
      const prevue = new Date(`1970-01-01T${commande.heure_livraison}`);
      const reelle = new Date(`1970-01-01T${commande.heure_reelle_livraison}`);
      const tempsMinutes = (reelle - prevue) / (1000 * 60);
      if (tempsMinutes > 0 && tempsMinutes < 1440) {
        totalTempsLivraison += tempsMinutes;
        nombreCommandesAvecTempsLivr++;
      }
    }
  });

  return {
    temps_moyen_preparation_minutes:
      nombreCommandesAvecTempsPrep > 0
        ? Math.round((totalTempsPreparation / nombreCommandesAvecTempsPrep) * 100) / 100
        : 0,
    temps_moyen_livraison_minutes:
      nombreCommandesAvecTempsLivr > 0
        ? Math.round((totalTempsLivraison / nombreCommandesAvecTempsLivr) * 100) / 100
        : 0,
  };
};

/**
 * Formate une date en HH:MM:SS
 */
const formatTime = (date) => {
  return date.toTimeString().split(" ")[0]; // HH:MM:SS
};

/**
 * Retourne des métriques vides
 */
const getEmptyMetrics = () => ({
  jour: new Date().toISOString().split("T")[0],
  ouverture: null,
  fermeture: null,
  duree_ouverture_minutes: 0,
  nombre_ventes_total: 0,
  nombre_ventes_sur_place: 0,
  nombre_ventes_livraison: 0,
  nombre_ventes_emporter: 0,
  nombre_paiements_momo: 0,
  nombre_paiements_cash: 0,
  nombre_paiements_autre: 0,
  nombre_paiements_mixtes: 0,
  montant_percu_momo: 0,
  montant_percu_cash: 0,
  montant_percu_autre: 0,
  chiffre_affaires: 0,
  panier_moyen: 0,
  ticket_moyen: 0,
  cadence_vente: 0,
  taux_livraison: 0,
  meilleur_produit_id: null,
  meilleur_produit_nom: null,
  meilleur_produit_quantite: 0,
  nombre_produits_distincts: 0,
  nombre_promotions_utilisees: 0,
  montant_total_remises: 0,
  nombre_points_vente_actifs: 0,
  meilleur_point_vente_id: null,
  meilleur_point_vente_nom: null,
  meilleur_point_vente_ca: 0,
  nombre_vendeurs_actifs: 0,
  meilleur_vendeur_id: null,
  meilleur_vendeur_nom: null,
  meilleur_vendeur_ventes: 0,
  nombre_clients_uniques: 0,
  taux_clients_reguliers: 0,
  heure_pointe_debut: null,
  heure_pointe_fin: null,
  ventes_heure_pointe: 0,
  nombre_commandes_annulees: 0,
  nombre_commandes_en_preparation: 0,
  nombre_commandes_livrees: 0,
  nombre_commandes_retirees: 0,
  taux_completion: 0,
  temps_moyen_preparation_minutes: 0,
  temps_moyen_livraison_minutes: 0,
});

// =====================================================
// ENREGISTREMENT DES CLÔTURES
// =====================================================

/**
 * Crée ou met à jour une clôture journalière
 * @param {Object} metrics - Métriques calculées
 * @param {string} userId - ID de l'utilisateur qui clôture
 * @param {string} notes - Notes optionnelles
 * @returns {Promise<Object>} Clôture enregistrée
 */
export const saveDayClosure = async (metrics, userId, notes = "") => {
  try {
    // Vérifier si une clôture existe déjà
    const existing = await getDayClosureByDate(metrics.jour);

    const closureData = {
      ...metrics,
      cloture_par: userId,
      cloture_a: new Date().toISOString(),
      notes,
    };

    if (existing) {
      // Mise à jour
      const { data, error } = await supabase
        .from("days")
        .update(closureData)
        .eq("jour", metrics.jour)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Insertion
      const { data, error } = await supabase.from("days").insert(closureData).select().single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error("Erreur saveDayClosure:", error);
    throw error;
  }
};

/**
 * Supprime une clôture journalière
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<void>}
 */
export const deleteDayClosure = async (date) => {
  try {
    const { error } = await supabase.from("days").delete().eq("jour", date);

    if (error) throw error;
  } catch (error) {
    console.error("Erreur deleteDayClosure:", error);
    throw error;
  }
};
