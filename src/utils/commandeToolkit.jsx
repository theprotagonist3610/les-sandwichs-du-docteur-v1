import { supabase } from "@/config/supabase";

// ============================================================================
// CACHE LOCAL AVEC INDEXEDDB
// ============================================================================

const DB_NAME = "CommandesCache";
const DB_VERSION = 1;
const STORE_NAME = "commandes_du_jour";

// ============================================================================
// REQUETE SELECT AVEC JOINTURE VENDEUR
// ============================================================================

/**
 * Requête select avec jointures sur les tables users et emplacements
 * - vendeur_info: infos du vendeur via FK "vendeur" vers users.id
 * - point_de_vente_info: infos du point de vente via FK "point_de_vente" vers emplacements.id
 */
const SELECT_COMMANDE_WITH_RELATIONS = `
  *,
  vendeur_info:users!vendeur(
    id,
    nom,
    prenoms,
    email,
    role
  ),
  point_de_vente_info:emplacements!point_de_vente(
    id,
    nom,
    type,
    adresse,
    statut
  )
`;

// ============================================================================
// POINT DE VENTE PAR DÉFAUT (EMPLACEMENT DE TYPE "BASE")
// ============================================================================

// Cache pour l'ID de l'emplacement de base
let _baseEmplacementId = null;

/**
 * Récupérer l'ID de l'emplacement de type "base" (point de vente par défaut)
 * Utilise un cache en mémoire pour éviter les requêtes répétées
 * @returns {Promise<string|null>} ID de l'emplacement de base
 */
export const getBaseEmplacementId = async () => {
  // Retourner le cache si disponible
  if (_baseEmplacementId) {
    return _baseEmplacementId;
  }

  try {
    const { data, error } = await supabase
      .from("emplacements")
      .select("id")
      .eq("type", "base")
      .single();

    if (error) {
      console.error("Erreur lors de la récupération de l'emplacement de base:", error);
      return null;
    }

    // Mettre en cache
    _baseEmplacementId = data?.id || null;
    return _baseEmplacementId;
  } catch (error) {
    console.error("Exception lors de la récupération de l'emplacement de base:", error);
    return null;
  }
};

/**
 * Réinitialiser le cache de l'emplacement de base
 * Utile si l'emplacement de base change
 */
export const clearBaseEmplacementCache = () => {
  _baseEmplacementId = null;
};

/**
 * Initialiser la base de données IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Créer l'object store si il n'existe pas
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });

        // Index sur la date de création pour filtrer les commandes du jour
        objectStore.createIndex("created_at", "created_at", { unique: false });
        objectStore.createIndex("date_cache", "date_cache", { unique: false });
      }
    };
  });
};

/**
 * Obtenir la date locale au format ISO (YYYY-MM-DD)
 * Utilise le fuseau horaire local au lieu de UTC
 * @param {Date} date - Date à formater (par défaut: maintenant)
 * @returns {string}
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Obtenir la date du jour au format ISO (YYYY-MM-DD)
 * @returns {string}
 */
export const getTodayDateString = () => {
  return getLocalDateString();
};

/**
 * Sauvegarder une commande dans le cache local
 * @param {Object} commande - Commande à sauvegarder
 * @returns {Promise<void>}
 */
export const saveToCache = async (commande) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Ajouter la date de cache
    const commandeWithCache = {
      ...commande,
      date_cache: getTodayDateString(),
    };

    await new Promise((resolve, reject) => {
      const request = store.put(commandeWithCache);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error("Erreur lors de la sauvegarde dans le cache:", error);
  }
};

/**
 * Récupérer toutes les commandes du jour depuis le cache
 * @returns {Promise<Array>}
 */
export const getFromCache = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("date_cache");

    const todayDate = getTodayDateString();

    const commandes = await new Promise((resolve, reject) => {
      const request = index.getAll(todayDate);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return commandes || [];
  } catch (error) {
    console.error("Erreur lors de la récupération depuis le cache:", error);
    return [];
  }
};

/**
 * Supprimer une commande du cache
 * @param {string} commandeId - ID de la commande à supprimer
 * @returns {Promise<void>}
 */
export const removeFromCache = async (commandeId) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete(commandeId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.error("Erreur lors de la suppression du cache:", error);
  }
};

/**
 * Nettoyer le cache (supprimer les commandes qui ne sont pas du jour)
 * @returns {Promise<void>}
 */
export const cleanCache = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const todayDate = getTodayDateString();

    // Récupérer toutes les commandes
    const allCommandes = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Supprimer celles qui ne sont pas du jour
    for (const commande of allCommandes) {
      if (commande.date_cache !== todayDate) {
        await new Promise((resolve, reject) => {
          const request = store.delete(commande.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }

    db.close();
  } catch (error) {
    console.error("Erreur lors du nettoyage du cache:", error);
  }
};

/**
 * Synchroniser le cache avec Supabase
 * Récupère les commandes du jour depuis Supabase et met à jour le cache
 * @returns {Promise<{commandes, error}>}
 */
export const syncCache = async () => {
  try {
    const todayDate = getTodayDateString();

    // Récupérer les commandes du jour depuis Supabase avec infos vendeur
    const { data: commandesSupabase, error } = await supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .gte("created_at", `${todayDate}T00:00:00`)
      .lte("created_at", `${todayDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la synchronisation:", error);
      return { commandes: [], error };
    }

    // Sauvegarder chaque commande dans le cache
    for (const commande of commandesSupabase || []) {
      await saveToCache(commande);
    }

    // Nettoyer les anciennes commandes
    await cleanCache();

    return { commandes: commandesSupabase || [], error: null };
  } catch (error) {
    console.error("Exception lors de la synchronisation:", error);
    return { commandes: [], error };
  }
};

/**
 * Toolkit de gestion des commandes
 * Gère les commandes (livraison et sur-place) avec paiements et promotions
 *
 * Schema:
 * {
 *   id: uuid,
 *   type: enum('livraison', 'sur-place'),
 *   client: string,
 *   contact_client: string,
 *   contact_alternatif: string,
 *   lieu_livraison: JSON,
 *   instructions_livraison: string,
 *   livreur: uuid,
 *   date_livraison: date,
 *   heure_livraison: time,
 *   date_reelle_livraison: date,
 *   heure_reelle_livraison: time,
 *   frais_livraison: number,
 *   statut_livraison: enum('en_attente', 'en_cours', 'livree', 'annulee'),
 *   statut_paiement: enum('non_payee', 'partiellement_payee', 'payee'),
 *   statut_commande: enum('en_cours', 'terminee', 'annulee'),
 *   details_commandes: JSON (array),
 *   promotion: JSON,
 *   details_paiement: JSON,
 *   vendeur: uuid (FK vers users),
 *   point_de_vente: uuid (FK vers emplacements - obligatoire),
 *   version: number (pour gestion des collisions),
 *   created_at: timestamp,
 *   updated_at: timestamp
 * }
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Types de commande possibles
 */
export const TYPES_COMMANDE = {
  LIVRAISON: "livraison",
  SUR_PLACE: "sur-place",
};

/**
 * Statuts de livraison
 */
export const STATUTS_LIVRAISON = {
  EN_ATTENTE: "en_attente",
  EN_COURS: "en_cours",
  LIVREE: "livree",
  ANNULEE: "annulee",
};

/**
 * Statuts de paiement
 */
export const STATUTS_PAIEMENT = {
  NON_PAYEE: "non_payee",
  PARTIELLEMENT_PAYEE: "partiellement_payee",
  PAYEE: "payee",
};

/**
 * Statuts de commande
 */
export const STATUTS_COMMANDE = {
  EN_COURS: "en_cours",
  TERMINEE: "terminee",
  ANNULEE: "annulee",
};

/**
 * Structure par défaut des détails de paiement
 */
export const DEFAULT_DETAILS_PAIEMENT = {
  total: 0,
  total_apres_reduction: 0,
  momo: 0,
  cash: 0,
  autre: 0,
};

/**
 * Structure par défaut d'une commande
 * Note: point_de_vente sera automatiquement défini à l'emplacement de base si non fourni
 */
export const DEFAULT_COMMANDE = {
  type: TYPES_COMMANDE.SUR_PLACE,
  client: "non identifie",
  contact_client: "",
  contact_alternatif: "",
  lieu_livraison: null,
  instructions_livraison: "",
  livreur: null,
  date_livraison: null,
  heure_livraison: null,
  frais_livraison: 0,
  statut_livraison: STATUTS_LIVRAISON.EN_ATTENTE,
  statut_paiement: STATUTS_PAIEMENT.NON_PAYEE,
  statut_commande: STATUTS_COMMANDE.EN_COURS,
  details_commandes: [],
  promotion: null,
  details_paiement: DEFAULT_DETAILS_PAIEMENT,
  point_de_vente: null, // Sera défini à l'emplacement de base par défaut lors de la création
};

// ============================================================================
// FONCTIONS CRUD DE BASE
// ============================================================================

/**
 * Créer une nouvelle commande
 * @param {Object} commandeData - Données de la commande
 * @param {string} vendeurId - ID du vendeur qui crée la commande
 * @returns {Promise<{commande, error}>}
 */
export const createCommande = async (commandeData, vendeurId) => {
  try {
    // Récupérer l'emplacement de base par défaut si point_de_vente n'est pas fourni
    let pointDeVente = commandeData.point_de_vente;
    if (!pointDeVente) {
      pointDeVente = await getBaseEmplacementId();
      if (!pointDeVente) {
        return {
          commande: null,
          error: {
            message: "Aucun emplacement de base trouvé. Veuillez configurer un emplacement de type 'base'.",
            code: "NO_BASE_EMPLACEMENT",
          },
        };
      }
    }

    // Fusionner avec les valeurs par défaut
    const newCommande = {
      ...DEFAULT_COMMANDE,
      ...commandeData,
      vendeur: vendeurId,
      point_de_vente: pointDeVente,
    };

    const { data, error } = await supabase
      .from("commandes")
      .insert([newCommande])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création de la commande:", error);
      return { commande: null, error };
    }

    // Sauvegarder dans le cache si c'est une commande du jour
    const today = getTodayDateString();
    const createdDate = data.created_at.split("T")[0];
    if (createdDate === today) {
      await saveToCache(data);
    }

    return { commande: data, error: null };
  } catch (error) {
    console.error("Exception lors de la création de la commande:", error);
    return { commande: null, error };
  }
};

/**
 * Récupérer une commande par son ID
 * @param {string} commandeId - ID de la commande
 * @returns {Promise<{commande, error}>}
 */
export const getCommandeById = async (commandeId) => {
  try {
    const { data, error } = await supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .eq("id", commandeId)
      .single();

    if (error) {
      console.error("Erreur lors de la récupération de la commande:", error);
      return { commande: null, error };
    }

    return { commande: data, error: null };
  } catch (error) {
    console.error("Exception lors de la récupération de la commande:", error);
    return { commande: null, error };
  }
};

/**
 * Récupérer toutes les commandes avec filtres optionnels
 * @param {Object} filters - Filtres optionnels
 * @param {string} filters.type - Type de commande
 * @param {string} filters.statut_commande - Statut de la commande
 * @param {string} filters.statut_livraison - Statut de livraison
 * @param {string} filters.statut_paiement - Statut de paiement
 * @param {string} filters.vendeur - ID du vendeur
 * @param {string} filters.livreur - ID du livreur
 * @param {string} filters.client - Nom du client
 * @param {Date} filters.date_livraison - Date de livraison
 * @param {string} filters.point_de_vente - ID du point de vente (emplacement)
 * @returns {Promise<{commandes, error}>}
 */
export const getAllCommandes = async (filters = {}) => {
  try {
    let query = supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .order("created_at", { ascending: false });

    // Appliquer les filtres
    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.statut_commande) {
      query = query.eq("statut_commande", filters.statut_commande);
    }

    if (filters.statut_livraison) {
      query = query.eq("statut_livraison", filters.statut_livraison);
    }

    if (filters.statut_paiement) {
      query = query.eq("statut_paiement", filters.statut_paiement);
    }

    if (filters.vendeur) {
      query = query.eq("vendeur", filters.vendeur);
    }

    if (filters.livreur) {
      query = query.eq("livreur", filters.livreur);
    }

    if (filters.client) {
      query = query.ilike("client", `%${filters.client}%`);
    }

    if (filters.point_de_vente) {
      query = query.eq("point_de_vente", filters.point_de_vente);
    }

    if (filters.date_livraison) {
      query = query.eq("date_livraison", filters.date_livraison);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération des commandes:", error);
    return { commandes: [], error };
  }
};

/**
 * Récupérer les commandes du jour (avec cache local)
 * En cas d'erreur réseau, utilise le cache IndexedDB
 * @param {boolean} forceSync - Forcer la synchronisation avec Supabase
 * @returns {Promise<{commandes, error, fromCache}>}
 */
export const getCommandesDuJour = async (forceSync = false) => {
  try {
    // Si on force la synchro ou si on est en ligne, essayer de récupérer depuis Supabase
    if (forceSync || navigator.onLine) {
      const todayDate = getTodayDateString();

      const { data: commandesSupabase, error } = await supabase
        .from("commandes")
        .select(SELECT_COMMANDE_WITH_RELATIONS)
        .gte("created_at", `${todayDate}T00:00:00`)
        .lte("created_at", `${todayDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (!error && commandesSupabase) {
        // Sauvegarder dans le cache
        for (const commande of commandesSupabase) {
          await saveToCache(commande);
        }

        // Nettoyer les anciennes commandes
        await cleanCache();

        return { commandes: commandesSupabase, error: null, fromCache: false };
      }

      // Si erreur réseau, tomber sur le cache
      if (error) {
        console.warn("Erreur Supabase, utilisation du cache local:", error);
      }
    }

    // Récupérer depuis le cache
    const cachedCommandes = await getFromCache();
    return {
      commandes: cachedCommandes,
      error: null,
      fromCache: true,
    };
  } catch (error) {
    console.error(
      "Exception lors de la récupération des commandes du jour:",
      error,
    );

    // En cas d'erreur, essayer le cache
    try {
      const cachedCommandes = await getFromCache();
      return {
        commandes: cachedCommandes,
        error: null,
        fromCache: true,
      };
    } catch (cacheError) {
      console.error("Erreur lors de la récupération du cache:", cacheError);
      return { commandes: [], error: cacheError, fromCache: false };
    }
  }
};

/**
 * Mettre à jour une commande
 * Gère la détection de collisions avec le champ version
 * @param {string} commandeId - ID de la commande
 * @param {Object} updates - Données à mettre à jour
 * @param {number} currentVersion - Version actuelle de la commande (pour détecter les collisions)
 * @returns {Promise<{commande, error, collision}>}
 */
export const updateCommande = async (commandeId, updates, currentVersion) => {
  try {
    // Retirer les champs qui ne doivent pas être mis à jour directement
    const { id, created_at, updated_at, version, ...safeUpdates } = updates;

    // Vérifier la version pour détecter les collisions
    const { data: existingCommande, error: fetchError } = await supabase
      .from("commandes")
      .select("version, statut_commande")
      .eq("id", commandeId)
      .single();

    if (fetchError) {
      console.error(
        "Erreur lors de la vérification de la commande:",
        fetchError,
      );
      return { commande: null, error: fetchError, collision: false };
    }

    // Vérifier si la commande a été modifiée par quelqu'un d'autre (collision)
    if (existingCommande.version !== currentVersion) {
      console.warn("Collision détectée lors de la mise à jour de la commande");
      return {
        commande: null,
        error: {
          message:
            "Cette commande a été modifiée par un autre utilisateur. Veuillez recharger les données.",
          code: "COLLISION_DETECTED",
        },
        collision: true,
      };
    }

    // Vérifier si la commande est clôturée
    if (existingCommande.statut_commande !== STATUTS_COMMANDE.EN_COURS) {
      return {
        commande: null,
        error: {
          message: "Cette commande est clôturée et ne peut plus être modifiée.",
          code: "COMMANDE_CLOSED",
        },
        collision: false,
      };
    }

    // Effectuer la mise à jour
    const { data, error } = await supabase
      .from("commandes")
      .update(safeUpdates)
      .eq("id", commandeId)
      .eq("version", currentVersion) // Double vérification au niveau SQL
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de la commande:", error);
      return { commande: null, error, collision: false };
    }

    // Mettre à jour le cache si c'est une commande du jour
    const today = getTodayDateString();
    const createdDate = data.created_at.split("T")[0];
    if (createdDate === today) {
      await saveToCache(data);
    }

    return { commande: data, error: null, collision: false };
  } catch (error) {
    console.error("Exception lors de la mise à jour de la commande:", error);
    return { commande: null, error, collision: false };
  }
};

/**
 * Supprimer une commande (admin uniquement)
 * @param {string} commandeId - ID de la commande
 * @returns {Promise<{error}>}
 */
export const deleteCommande = async (commandeId) => {
  try {
    const { error } = await supabase
      .from("commandes")
      .delete()
      .eq("id", commandeId);

    if (error) {
      console.error("Erreur lors de la suppression de la commande:", error);
      return { error };
    }

    // Supprimer du cache également
    await removeFromCache(commandeId);

    return { error: null };
  } catch (error) {
    console.error("Exception lors de la suppression de la commande:", error);
    return { error };
  }
};

// ============================================================================
// GESTION DES PAIEMENTS
// ============================================================================

/**
 * Calculer le total d'une commande à partir des détails
 * @param {Array} detailsCommandes - Liste des items [{item, quantite, prix_unitaire, total}]
 * @returns {number} Total de la commande
 */
export const calculateTotal = (detailsCommandes) => {
  if (!Array.isArray(detailsCommandes) || detailsCommandes.length === 0) {
    return 0;
  }

  return detailsCommandes.reduce((sum, item) => {
    const itemTotal = item.total || item.quantite * item.prix_unitaire;
    return sum + itemTotal;
  }, 0);
};

/**
 * Appliquer une promotion à une commande
 * @param {number} total - Total avant réduction
 * @param {Object} promotion - Objet promotion {code, type, valeur}
 * @returns {Object} {total_apres_reduction, montant_reduction}
 */
export const applyPromotion = (total, promotion) => {
  if (!promotion || !promotion.type || !promotion.valeur) {
    return {
      total_apres_reduction: total,
      montant_reduction: 0,
    };
  }

  let montant_reduction = 0;

  if (promotion.type === "pourcentage") {
    montant_reduction = (total * promotion.valeur) / 100;
  } else if (promotion.type === "montant") {
    montant_reduction = promotion.valeur;
  }

  const total_apres_reduction = Math.max(0, total - montant_reduction);

  return {
    total_apres_reduction,
    montant_reduction,
  };
};

/**
 * Enregistrer un paiement pour une commande
 * @param {string} commandeId - ID de la commande
 * @param {Object} paiement - Détails du paiement {momo, cash, autre}
 * @param {number} currentVersion - Version actuelle de la commande
 * @returns {Promise<{commande, error}>}
 */
export const recordPayment = async (commandeId, paiement, currentVersion) => {
  try {
    // Récupérer la commande actuelle
    const { commande: existingCommande, error: fetchError } =
      await getCommandeById(commandeId);

    if (fetchError || !existingCommande) {
      return { commande: null, error: fetchError };
    }

    // Calculer le total
    const total = calculateTotal(existingCommande.details_commandes);

    // Appliquer la promotion si elle existe
    const { total_apres_reduction } = applyPromotion(
      total,
      existingCommande.promotion,
    );

    // Calculer le total payé
    const total_paye =
      (paiement.momo || 0) + (paiement.cash || 0) + (paiement.autre || 0);

    // Déterminer le statut de paiement
    let statut_paiement = STATUTS_PAIEMENT.NON_PAYEE;
    if (total_paye >= total_apres_reduction) {
      statut_paiement = STATUTS_PAIEMENT.PAYEE;
    } else if (total_paye > 0) {
      statut_paiement = STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE;
    }

    // Mettre à jour les détails de paiement
    const details_paiement = {
      total,
      total_apres_reduction,
      momo: paiement.momo || 0,
      cash: paiement.cash || 0,
      autre: paiement.autre || 0,
    };

    // Mettre à jour la commande
    return await updateCommande(
      commandeId,
      {
        details_paiement,
        statut_paiement,
      },
      currentVersion,
    );
  } catch (error) {
    console.error("Exception lors de l'enregistrement du paiement:", error);
    return { commande: null, error };
  }
};

// ============================================================================
// GESTION DES LIVREURS
// ============================================================================

/**
 * Assigner un livreur à une commande
 * @param {string} commandeId - ID de la commande
 * @param {string} livreurId - ID du livreur
 * @param {number} currentVersion - Version actuelle de la commande
 * @returns {Promise<{commande, error}>}
 */
export const assignLivreur = async (commandeId, livreurId, currentVersion) => {
  return await updateCommande(
    commandeId,
    {
      livreur: livreurId,
      statut_livraison: STATUTS_LIVRAISON.EN_COURS,
    },
    currentVersion,
  );
};

/**
 * Mettre à jour le statut de livraison
 * @param {string} commandeId - ID de la commande
 * @param {string} nouveauStatut - Nouveau statut de livraison
 * @param {number} currentVersion - Version actuelle de la commande
 * @returns {Promise<{commande, error}>}
 */
export const updateStatutLivraison = async (
  commandeId,
  nouveauStatut,
  currentVersion,
) => {
  const updates = {
    statut_livraison: nouveauStatut,
  };

  // Si la livraison est terminée, enregistrer la date et l'heure réelles
  if (nouveauStatut === STATUTS_LIVRAISON.LIVREE) {
    const now = new Date();
    updates.date_reelle_livraison = getLocalDateString(now);
    updates.heure_reelle_livraison = now.toTimeString().split(" ")[0];
  }

  return await updateCommande(commandeId, updates, currentVersion);
};

// ============================================================================
// CLÔTURE DE COMMANDES
// ============================================================================

/**
 * Clôturer une commande (terminée ou annulée)
 * @param {string} commandeId - ID de la commande
 * @param {string} statut - 'terminee' ou 'annulee'
 * @param {number} currentVersion - Version actuelle de la commande
 * @returns {Promise<{commande, error}>}
 */
export const closeCommande = async (commandeId, statut, currentVersion) => {
  if (
    statut !== STATUTS_COMMANDE.TERMINEE &&
    statut !== STATUTS_COMMANDE.ANNULEE
  ) {
    return {
      commande: null,
      error: {
        message: "Le statut doit être 'terminee' ou 'annulee'",
        code: "INVALID_STATUS",
      },
    };
  }

  return await updateCommande(
    commandeId,
    {
      statut_commande: statut,
    },
    currentVersion,
  );
};

/**
 * Livrer et clôturer une commande en une seule opération
 * Met à jour statut_livraison à 'livree' et statut_commande à 'terminee'
 * @param {string} commandeId - ID de la commande
 * @param {number} currentVersion - Version actuelle de la commande
 * @returns {Promise<{commande, error}>}
 */
export const deliverAndCloseCommande = async (commandeId, currentVersion) => {
  try {
    const now = new Date();

    // Mettre à jour les deux statuts en une seule opération
    const updates = {
      statut_livraison: STATUTS_LIVRAISON.LIVREE,
      statut_commande: STATUTS_COMMANDE.TERMINEE,
      date_reelle_livraison: getLocalDateString(now),
      heure_reelle_livraison: now.toTimeString().split(" ")[0],
    };

    return await updateCommande(commandeId, updates, currentVersion);
  } catch (error) {
    console.error("Exception lors de la livraison et clôture:", error);
    return { commande: null, error };
  }
};

/**
 * Archiver les commandes terminées ou annulées d'une journée
 * Cette fonction clôture toutes les commandes du jour qui sont livrées ou annulées
 * @param {Date} date - Date des commandes à archiver (par défaut: aujourd'hui)
 * @returns {Promise<{archivedCount, error}>}
 */
export const archiveDailyCommandes = async (date = new Date()) => {
  try {
    const dateStr = getLocalDateString(date);

    // Récupérer toutes les commandes du jour qui sont livrées ou annulées
    // mais dont le statut_commande est encore 'en_cours'
    const { data: commandesToArchive, error: fetchError } = await supabase
      .from("commandes")
      .select("id, version, statut_livraison")
      .eq("date_livraison", dateStr)
      .eq("statut_commande", STATUTS_COMMANDE.EN_COURS)
      .in("statut_livraison", [
        STATUTS_LIVRAISON.LIVREE,
        STATUTS_LIVRAISON.ANNULEE,
      ]);

    if (fetchError) {
      console.error(
        "Erreur lors de la récupération des commandes à archiver:",
        fetchError,
      );
      return { archivedCount: 0, error: fetchError };
    }

    if (!commandesToArchive || commandesToArchive.length === 0) {
      return { archivedCount: 0, error: null };
    }

    // Clôturer chaque commande
    let archivedCount = 0;
    const errors = [];

    for (const commande of commandesToArchive) {
      const statut =
        commande.statut_livraison === STATUTS_LIVRAISON.LIVREE
          ? STATUTS_COMMANDE.TERMINEE
          : STATUTS_COMMANDE.ANNULEE;

      const { error } = await closeCommande(
        commande.id,
        statut,
        commande.version,
      );

      if (error) {
        errors.push({ commandeId: commande.id, error });
      } else {
        archivedCount++;
      }
    }

    if (errors.length > 0) {
      console.warn("Erreurs lors de l'archivage:", errors);
    }

    return {
      archivedCount,
      error: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    console.error("Exception lors de l'archivage des commandes:", error);
    return { archivedCount: 0, error };
  }
};

// ============================================================================
// FILTRAGE GÉOGRAPHIQUE
// ============================================================================

/**
 * Filtrer les commandes par localisation (département, commune, arrondissement, quartier)
 * @param {Object} location - Critères de localisation
 * @param {string} location.departement - Département
 * @param {string} location.commune - Commune
 * @param {string} location.arrondissement - Arrondissement
 * @param {string} location.quartier - Quartier
 * @returns {Promise<{commandes, error}>}
 */
export const getCommandesByLocation = async (location) => {
  try {
    let query = supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });

    // Filtrer par département
    if (location.departement) {
      query = query.contains("lieu_livraison", {
        departement: location.departement,
      });
    }

    // Filtrer par commune
    if (location.commune) {
      query = query.contains("lieu_livraison", { commune: location.commune });
    }

    // Filtrer par arrondissement
    if (location.arrondissement) {
      query = query.contains("lieu_livraison", {
        arrondissement: location.arrondissement,
      });
    }

    // Filtrer par quartier
    if (location.quartier) {
      query = query.contains("lieu_livraison", { quartier: location.quartier });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors du filtrage par localisation:", error);
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    console.error("Exception lors du filtrage par localisation:", error);
    return { commandes: [], error };
  }
};

/**
 * Calculer la distance entre deux points GPS (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lng1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lng2 - Longitude du point 2
 * @returns {number} Distance en kilomètres
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Récupérer les commandes dans un rayon donné autour d'un point
 * @param {number} lat - Latitude du point central
 * @param {number} lng - Longitude du point central
 * @param {number} radius - Rayon en kilomètres
 * @returns {Promise<{commandes, error}>}
 */
export const getCommandesInRadius = async (lat, lng, radius) => {
  try {
    // Récupérer toutes les commandes (on filtrera côté client)
    const { data: allCommandes, error } = await supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
      return { commandes: [], error };
    }

    // Filtrer les commandes dans le rayon
    const commandesInRadius = (allCommandes || []).filter((commande) => {
      // Vérifier si la commande a une localisation
      const loc = commande.lieu_livraison?.localisation;
      if (!loc || !loc.lat || !loc.lng) {
        return false;
      }

      // Calculer la distance
      const distance = calculateDistance(lat, lng, loc.lat, loc.lng);

      return distance <= radius;
    });

    return { commandes: commandesInRadius, error: null };
  } catch (error) {
    console.error("Exception lors du filtrage par proximité:", error);
    return { commandes: [], error };
  }
};

// ============================================================================
// EXPORT DE DONNÉES
// ============================================================================

/**
 * Exporter les commandes au format CSV
 * @param {Array} commandes - Liste des commandes à exporter
 * @returns {string} Contenu CSV
 */
export const exportToCSV = (commandes) => {
  if (!Array.isArray(commandes) || commandes.length === 0) {
    return "";
  }

  // Définir les en-têtes
  const headers = [
    "ID",
    "Type",
    "Client",
    "Contact",
    "Statut Commande",
    "Statut Livraison",
    "Statut Paiement",
    "Date Livraison",
    "Heure Livraison",
    "Frais Livraison",
    "Total",
    "Total Après Réduction",
    "Vendeur",
    "Livreur",
    "Point de Vente",
    "Date Création",
  ];

  // Créer les lignes
  const rows = commandes.map((commande) => {
    // Récupérer le nom du point de vente si disponible via la jointure
    const pointDeVenteNom = commande.point_de_vente_info?.nom || commande.point_de_vente || "";

    return [
      commande.id,
      commande.type,
      commande.client,
      commande.contact_client,
      commande.statut_commande,
      commande.statut_livraison,
      commande.statut_paiement,
      commande.date_livraison || "",
      commande.heure_livraison || "",
      commande.frais_livraison,
      commande.details_paiement?.total || 0,
      commande.details_paiement?.total_apres_reduction || 0,
      commande.vendeur || "",
      commande.livreur || "",
      pointDeVenteNom,
      commande.created_at,
    ]
      .map((value) => `"${value}"`)
      .join(",");
  });

  // Combiner en-têtes et lignes
  const csv = [headers.join(","), ...rows].join("\n");

  return csv;
};

/**
 * Télécharger les commandes au format CSV
 * @param {Array} commandes - Liste des commandes à exporter
 * @param {string} filename - Nom du fichier (par défaut: commandes_DATE.csv)
 */
export const downloadCSV = (commandes, filename = null) => {
  const csv = exportToCSV(commandes);

  if (!csv) {
    console.warn("Aucune commande à exporter");
    return;
  }

  const finalFilename =
    filename || `commandes_${getLocalDateString()}.csv`;

  // Créer un blob et déclencher le téléchargement
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
 * Exporter les commandes au format JSON
 * @param {Array} commandes - Liste des commandes à exporter
 * @returns {string} Contenu JSON formatté
 */
export const exportToJSON = (commandes) => {
  return JSON.stringify(commandes, null, 2);
};

/**
 * Télécharger les commandes au format JSON
 * @param {Array} commandes - Liste des commandes à exporter
 * @param {string} filename - Nom du fichier (par défaut: commandes_DATE.json)
 */
export const downloadJSON = (commandes, filename = null) => {
  const json = exportToJSON(commandes);

  const finalFilename =
    filename || `commandes_${getLocalDateString()}.json`;

  // Créer un blob et déclencher le téléchargement
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", finalFilename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================================
// FONCTIONS HELPERS ET VALIDATION
// ============================================================================

/**
 * Valider les données d'une commande
 * @param {Object} commandeData - Données de la commande à valider
 * @returns {Object} {isValid, errors}
 */
export const validateCommande = (commandeData) => {
  const errors = [];

  // Vérifier le type
  if (
    !commandeData.type ||
    !Object.values(TYPES_COMMANDE).includes(commandeData.type)
  ) {
    errors.push("Type de commande invalide");
  }

  // Vérifier les détails de commande
  if (
    !Array.isArray(commandeData.details_commandes) ||
    commandeData.details_commandes.length === 0
  ) {
    errors.push("La commande doit contenir au moins un item");
  }

  // Valider chaque item
  commandeData.details_commandes?.forEach((item, index) => {
    if (!item.item || typeof item.item !== "string") {
      errors.push(`Item ${index + 1}: nom manquant`);
    }
    if (!item.quantite || item.quantite <= 0) {
      errors.push(`Item ${index + 1}: quantité invalide`);
    }
    if (!item.prix_unitaire || item.prix_unitaire < 0) {
      errors.push(`Item ${index + 1}: prix unitaire invalide`);
    }
  });

  // Si livraison, vérifier les informations requises
  if (commandeData.type === TYPES_COMMANDE.LIVRAISON) {
    if (!commandeData.lieu_livraison) {
      errors.push("Adresse de livraison requise pour une livraison");
    }
    if (!commandeData.contact_client) {
      errors.push("Contact client requis pour une livraison");
    }
  }

  // Note: point_de_vente n'est pas validé ici car il est automatiquement
  // défini à l'emplacement de base dans createCommande si non fourni

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Vérifier les permissions d'un utilisateur pour gérer les commandes
 * @param {string} userRole - Rôle de l'utilisateur
 * @param {string} action - Action à effectuer ('create', 'read', 'update', 'delete')
 * @returns {boolean}
 */
export const canManageCommandes = (userRole, action = "read") => {
  const rolePermissions = {
    admin: ["create", "read", "update", "delete"],
    superviseur: ["create", "read", "update"],
    vendeur: ["create", "read", "update"],
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(action);
};

/**
 * Formater une commande pour l'affichage
 * @param {Object} commande - Commande à formater
 * @returns {Object} Commande formatée avec des champs calculés
 */
export const formatCommande = (commande) => {
  const total = calculateTotal(commande.details_commandes);
  const { total_apres_reduction } = applyPromotion(total, commande.promotion);

  return {
    ...commande,
    total_calcule: total,
    total_final: total_apres_reduction,
    nombre_items: commande.details_commandes?.length || 0,
    est_payee: commande.statut_paiement === STATUTS_PAIEMENT.PAYEE,
    est_livree: commande.statut_livraison === STATUTS_LIVRAISON.LIVREE,
    est_cloturee: commande.statut_commande !== STATUTS_COMMANDE.EN_COURS,
  };
};

/**
 * Obtenir les statistiques des commandes
 * @param {Array} commandes - Liste des commandes
 * @returns {Object} Statistiques
 */
export const getCommandesStats = (commandes) => {
  if (!Array.isArray(commandes) || commandes.length === 0) {
    return {
      total: 0,
      en_cours: 0,
      terminees: 0,
      annulees: 0,
      livraisons: 0,
      sur_place: 0,
      montant_total: 0,
      montant_paye: 0,
    };
  }

  const stats = {
    total: commandes.length,
    en_cours: 0,
    terminees: 0,
    annulees: 0,
    livraisons: 0,
    sur_place: 0,
    montant_total: 0,
    montant_paye: 0,
  };

  commandes.forEach((commande) => {
    // Statuts
    if (commande.statut_commande === STATUTS_COMMANDE.EN_COURS)
      stats.en_cours++;
    if (commande.statut_commande === STATUTS_COMMANDE.TERMINEE)
      stats.terminees++;
    if (commande.statut_commande === STATUTS_COMMANDE.ANNULEE) stats.annulees++;

    // Types
    if (commande.type === TYPES_COMMANDE.LIVRAISON) stats.livraisons++;
    if (commande.type === TYPES_COMMANDE.SUR_PLACE) stats.sur_place++;

    // Montants
    stats.montant_total +=
      commande.details_paiement?.total_apres_reduction || 0;

    const total_paye =
      (commande.details_paiement?.momo || 0) +
      (commande.details_paiement?.cash || 0) +
      (commande.details_paiement?.autre || 0);

    stats.montant_paye += total_paye;
  });

  return stats;
};

// Export de toutes les fonctions
export default {
  // Constantes
  TYPES_COMMANDE,
  STATUTS_LIVRAISON,
  STATUTS_PAIEMENT,
  STATUTS_COMMANDE,
  DEFAULT_DETAILS_PAIEMENT,
  DEFAULT_COMMANDE,

  // CRUD
  createCommande,
  getCommandeById,
  getAllCommandes,
  getCommandesDuJour,
  updateCommande,
  deleteCommande,

  // Cache local
  syncCache,
  cleanCache,
  getFromCache,
  saveToCache,
  removeFromCache,

  // Point de vente par défaut
  getBaseEmplacementId,
  clearBaseEmplacementCache,

  // Paiements
  calculateTotal,
  applyPromotion,
  recordPayment,

  // Livreurs
  assignLivreur,
  updateStatutLivraison,

  // Clôture
  closeCommande,
  deliverAndCloseCommande,
  archiveDailyCommandes,

  // Filtrage géographique
  getCommandesByLocation,
  getCommandesInRadius,

  // Export
  exportToCSV,
  downloadCSV,
  exportToJSON,
  downloadJSON,

  // Helpers et validation
  validateCommande,
  canManageCommandes,
  formatCommande,
  getCommandesStats,
};
