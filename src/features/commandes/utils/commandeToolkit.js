import { supabase } from "@/lib/supabase";

// ============================================================================
// CACHE LOCAL AVEC INDEXEDDB
// ============================================================================

const DB_NAME = "CommandesCache";
const DB_VERSION = 1;
const STORE_NAME = "commandes_du_jour";

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

let _baseEmplacementId = null;

export const getBaseEmplacementId = async () => {
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
      return null;
    }

    _baseEmplacementId = data?.id || null;
    return _baseEmplacementId;
  } catch {
    return null;
  }
};

export const clearBaseEmplacementCache = () => {
  _baseEmplacementId = null;
};

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        objectStore.createIndex("created_at", "created_at", { unique: false });
        objectStore.createIndex("date_cache", "date_cache", { unique: false });
      }
    };
  });
};

export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDateString = () => {
  return getLocalDateString();
};

export const saveToCache = async (commande) => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

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
  } catch {}
};

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
  } catch {
    return [];
  }
};

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
  } catch {}
};

export const cleanCache = async () => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const todayDate = getTodayDateString();

    const allCommandes = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

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
  } catch {}
};

export const syncCache = async () => {
  try {
    const todayDate = getTodayDateString();

    const { data: commandesSupabase, error } = await supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .gte("created_at", `${todayDate}T00:00:00`)
      .lte("created_at", `${todayDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      return { commandes: [], error };
    }

    for (const commande of commandesSupabase || []) {
      await saveToCache(commande);
    }

    await cleanCache();

    return { commandes: commandesSupabase || [], error: null };
  } catch (error) {
    return { commandes: [], error };
  }
};

// ============================================================================
// CONSTANTES
// ============================================================================

export const TYPES_COMMANDE = {
  LIVRAISON: "livraison",
  SUR_PLACE: "sur-place",
};

export const STATUTS_LIVRAISON = {
  EN_ATTENTE: "en_attente",
  EN_COURS: "en_cours",
  LIVREE: "livree",
  ANNULEE: "annulee",
};

export const STATUTS_PAIEMENT = {
  NON_PAYEE: "non_payee",
  PARTIELLEMENT_PAYEE: "partiellement_payee",
  PAYEE: "payee",
};

export const STATUTS_COMMANDE = {
  EN_COURS: "en_cours",
  TERMINEE: "terminee",
  ANNULEE: "annulee",
};

export const DEFAULT_DETAILS_PAIEMENT = {
  total: 0,
  total_apres_reduction: 0,
  momo: 0,
  cash: 0,
  autre: 0,
};

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
  point_de_vente: null,
};

// ============================================================================
// FONCTIONS CRUD DE BASE
// ============================================================================

export const createCommande = async (commandeData, vendeurId) => {
  try {
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
      return { commande: null, error };
    }

    const today = getTodayDateString();
    const createdDate = data.created_at.split("T")[0];
    if (createdDate === today) {
      await saveToCache(data);
    }

    return { commande: data, error: null };
  } catch (error) {
    return { commande: null, error };
  }
};

export const getCommandeById = async (commandeId) => {
  try {
    const { data, error } = await supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .eq("id", commandeId)
      .single();

    if (error) {
      return { commande: null, error };
    }

    return { commande: data, error: null };
  } catch (error) {
    return { commande: null, error };
  }
};

export const getAllCommandes = async (filters = {}) => {
  try {
    let query = supabase
      .from("commandes")
      .select(SELECT_COMMANDE_WITH_RELATIONS)
      .order("created_at", { ascending: false });

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

    if (filters.dateFrom) {
      query = query.gte("created_at", `${filters.dateFrom}T00:00:00`);
    }

    if (filters.dateTo) {
      query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    return { commandes: [], error };
  }
};

export const getCommandesDuJour = async (forceSync = false) => {
  try {
    if (forceSync || navigator.onLine) {
      const todayDate = getTodayDateString();

      const { data: commandesSupabase, error } = await supabase
        .from("commandes")
        .select(SELECT_COMMANDE_WITH_RELATIONS)
        .gte("created_at", `${todayDate}T00:00:00`)
        .lte("created_at", `${todayDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (!error && commandesSupabase) {
        for (const commande of commandesSupabase) {
          await saveToCache(commande);
        }
        await cleanCache();
        return { commandes: commandesSupabase, error: null, fromCache: false };
      }
    }

    const cachedCommandes = await getFromCache();
    return { commandes: cachedCommandes, error: null, fromCache: true };
  } catch {
    try {
      const cachedCommandes = await getFromCache();
      return { commandes: cachedCommandes, error: null, fromCache: true };
    } catch (cacheError) {
      return { commandes: [], error: cacheError, fromCache: false };
    }
  }
};

export const updateCommande = async (commandeId, updates, currentVersion) => {
  try {
    const { id, created_at, updated_at, version, ...safeUpdates } = updates;

    const { data: existingCommande, error: fetchError } = await supabase
      .from("commandes")
      .select("version, statut_commande")
      .eq("id", commandeId)
      .single();

    if (fetchError) {
      return { commande: null, error: fetchError, collision: false };
    }

    if (existingCommande.version !== currentVersion) {
      return {
        commande: null,
        error: {
          message: "Cette commande a été modifiée par un autre utilisateur. Veuillez recharger les données.",
          code: "COLLISION_DETECTED",
        },
        collision: true,
      };
    }

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

    const { data, error } = await supabase
      .from("commandes")
      .update(safeUpdates)
      .eq("id", commandeId)
      .eq("version", currentVersion)
      .select()
      .single();

    if (error) {
      return { commande: null, error, collision: false };
    }

    const today = getTodayDateString();
    const createdDate = data.created_at.split("T")[0];
    if (createdDate === today) {
      await saveToCache(data);
    }

    return { commande: data, error: null, collision: false };
  } catch (error) {
    return { commande: null, error, collision: false };
  }
};

export const deleteCommande = async (commandeId) => {
  try {
    const { error } = await supabase
      .from("commandes")
      .delete()
      .eq("id", commandeId);

    if (error) {
      return { error };
    }

    await removeFromCache(commandeId);

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// ============================================================================
// GESTION DES PAIEMENTS
// ============================================================================

export const calculateTotal = (detailsCommandes) => {
  if (!Array.isArray(detailsCommandes) || detailsCommandes.length === 0) {
    return 0;
  }

  return detailsCommandes.reduce((sum, item) => {
    const itemTotal = item.total || item.quantite * item.prix_unitaire;
    return sum + itemTotal;
  }, 0);
};

export const applyPromotion = (total, promotion) => {
  if (!promotion || !promotion.type || !promotion.valeur) {
    return { total_apres_reduction: total, montant_reduction: 0 };
  }

  let montant_reduction = 0;

  if (promotion.type === "pourcentage") {
    montant_reduction = (total * promotion.valeur) / 100;
  } else if (promotion.type === "montant") {
    montant_reduction = promotion.valeur;
  }

  const total_apres_reduction = Math.max(0, total - montant_reduction);

  return { total_apres_reduction, montant_reduction };
};

export const recordPayment = async (commandeId, paiement, currentVersion) => {
  try {
    const { commande: existingCommande, error: fetchError } =
      await getCommandeById(commandeId);

    if (fetchError || !existingCommande) {
      return { commande: null, error: fetchError };
    }

    const total = calculateTotal(existingCommande.details_commandes);
    const { total_apres_reduction } = applyPromotion(total, existingCommande.promotion);

    const total_paye =
      (paiement.momo || 0) + (paiement.cash || 0) + (paiement.autre || 0);

    let statut_paiement = STATUTS_PAIEMENT.NON_PAYEE;
    if (total_paye >= total_apres_reduction) {
      statut_paiement = STATUTS_PAIEMENT.PAYEE;
    } else if (total_paye > 0) {
      statut_paiement = STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE;
    }

    const details_paiement = {
      total,
      total_apres_reduction,
      momo: paiement.momo || 0,
      cash: paiement.cash || 0,
      autre: paiement.autre || 0,
    };

    return await updateCommande(
      commandeId,
      { details_paiement, statut_paiement },
      currentVersion,
    );
  } catch (error) {
    return { commande: null, error };
  }
};

// ============================================================================
// GESTION DES LIVREURS
// ============================================================================

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

export const updateStatutLivraison = async (commandeId, nouveauStatut, currentVersion) => {
  const updates = { statut_livraison: nouveauStatut };

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

  return await updateCommande(commandeId, { statut_commande: statut }, currentVersion);
};

export const deliverAndCloseCommande = async (commandeId, currentVersion) => {
  try {
    const now = new Date();

    const updates = {
      statut_livraison: STATUTS_LIVRAISON.LIVREE,
      statut_commande: STATUTS_COMMANDE.TERMINEE,
      date_reelle_livraison: getLocalDateString(now),
      heure_reelle_livraison: now.toTimeString().split(" ")[0],
    };

    return await updateCommande(commandeId, updates, currentVersion);
  } catch (error) {
    return { commande: null, error };
  }
};

export const archiveDailyCommandes = async (date = new Date()) => {
  try {
    const dateStr = getLocalDateString(date);

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
      return { archivedCount: 0, error: fetchError };
    }

    if (!commandesToArchive || commandesToArchive.length === 0) {
      return { archivedCount: 0, error: null };
    }

    let archivedCount = 0;
    const errors = [];

    for (const commande of commandesToArchive) {
      const statut =
        commande.statut_livraison === STATUTS_LIVRAISON.LIVREE
          ? STATUTS_COMMANDE.TERMINEE
          : STATUTS_COMMANDE.ANNULEE;

      const { error } = await closeCommande(commande.id, statut, commande.version);

      if (error) {
        errors.push({ commandeId: commande.id, error });
      } else {
        archivedCount++;
      }
    }

    return {
      archivedCount,
      error: errors.length > 0 ? errors : null,
    };
  } catch (error) {
    return { archivedCount: 0, error };
  }
};

// ============================================================================
// FILTRAGE GÉOGRAPHIQUE
// ============================================================================

export const getCommandesByLocation = async (location) => {
  try {
    let query = supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });

    if (location.departement) {
      query = query.contains("lieu_livraison", { departement: location.departement });
    }

    if (location.commune) {
      query = query.contains("lieu_livraison", { commune: location.commune });
    }

    if (location.arrondissement) {
      query = query.contains("lieu_livraison", { arrondissement: location.arrondissement });
    }

    if (location.quartier) {
      query = query.contains("lieu_livraison", { quartier: location.quartier });
    }

    const { data, error } = await query;

    if (error) {
      return { commandes: [], error };
    }

    return { commandes: data || [], error: null };
  } catch (error) {
    return { commandes: [], error };
  }
};

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getCommandesInRadius = async (lat, lng, radius) => {
  try {
    const { data: allCommandes, error } = await supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { commandes: [], error };
    }

    const commandesInRadius = (allCommandes || []).filter((commande) => {
      const loc = commande.lieu_livraison?.localisation;
      if (!loc || !loc.lat || !loc.lng) {
        return false;
      }
      const distance = calculateDistance(lat, lng, loc.lat, loc.lng);
      return distance <= radius;
    });

    return { commandes: commandesInRadius, error: null };
  } catch (error) {
    return { commandes: [], error };
  }
};

// ============================================================================
// EXPORT DE DONNÉES
// ============================================================================

export const exportToCSV = (commandes) => {
  if (!Array.isArray(commandes) || commandes.length === 0) {
    return "";
  }

  const headers = [
    "ID", "Type", "Client", "Contact", "Statut Commande",
    "Statut Livraison", "Statut Paiement", "Date Livraison", "Heure Livraison",
    "Frais Livraison", "Total", "Total Après Réduction", "Vendeur", "Livreur",
    "Point de Vente", "Date Création",
  ];

  const rows = commandes.map((commande) => {
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

  return [headers.join(","), ...rows].join("\n");
};

export const downloadCSV = (commandes, filename = null) => {
  const csv = exportToCSV(commandes);

  if (!csv) {
    return;
  }

  const finalFilename = filename || `commandes_${getLocalDateString()}.csv`;

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

export const exportToJSON = (commandes) => {
  return JSON.stringify(commandes, null, 2);
};

export const downloadJSON = (commandes, filename = null) => {
  const json = exportToJSON(commandes);

  const finalFilename = filename || `commandes_${getLocalDateString()}.json`;

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

export const validateCommande = (commandeData) => {
  const errors = [];

  if (
    !commandeData.type ||
    !Object.values(TYPES_COMMANDE).includes(commandeData.type)
  ) {
    errors.push("Type de commande invalide");
  }

  if (
    !Array.isArray(commandeData.details_commandes) ||
    commandeData.details_commandes.length === 0
  ) {
    errors.push("La commande doit contenir au moins un item");
  }

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

  if (commandeData.type === TYPES_COMMANDE.LIVRAISON) {
    if (!commandeData.lieu_livraison) {
      errors.push("Adresse de livraison requise pour une livraison");
    }
    if (!commandeData.contact_client) {
      errors.push("Contact client requis pour une livraison");
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const canManageCommandes = (userRole, action = "read") => {
  const rolePermissions = {
    admin: ["create", "read", "update", "delete"],
    superviseur: ["create", "read", "update"],
    vendeur: ["create", "read", "update"],
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes(action);
};

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
    if (commande.statut_commande === STATUTS_COMMANDE.EN_COURS) stats.en_cours++;
    if (commande.statut_commande === STATUTS_COMMANDE.TERMINEE) stats.terminees++;
    if (commande.statut_commande === STATUTS_COMMANDE.ANNULEE) stats.annulees++;

    if (commande.type === TYPES_COMMANDE.LIVRAISON) stats.livraisons++;
    if (commande.type === TYPES_COMMANDE.SUR_PLACE) stats.sur_place++;

    stats.montant_total += commande.details_paiement?.total_apres_reduction || 0;

    const total_paye =
      (commande.details_paiement?.momo || 0) +
      (commande.details_paiement?.cash || 0) +
      (commande.details_paiement?.autre || 0);

    stats.montant_paye += total_paye;
  });

  return stats;
};
