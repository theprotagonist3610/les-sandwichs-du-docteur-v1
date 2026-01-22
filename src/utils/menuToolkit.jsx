// ============================================================================
// MENU TOOLKIT - GESTION DES MENUS (SANDWICHS, BOISSONS, DESSERTS, MENUS COMPLETS)
// ============================================================================
// Fonctionnalités complètes pour la gestion des menus de la sandwicherie
// ============================================================================

import { supabase } from "@/config/supabase";

// ============================================================================
// CONSTANTES
// ============================================================================

export const MENU_TYPES = {
  BOISSON: "boisson",
  SANDWICH: "sandwich",
  DESSERT: "dessert",
  MENU_COMPLET: "menu complet",
};

export const MENU_STATUTS = {
  DISPONIBLE: "disponible",
  INDISPONIBLE: "indisponible",
};

export const MENU_TYPE_LABELS = {
  [MENU_TYPES.BOISSON]: "Boisson",
  [MENU_TYPES.SANDWICH]: "Sandwich",
  [MENU_TYPES.DESSERT]: "Dessert",
  [MENU_TYPES.MENU_COMPLET]: "Menu Complet",
};

export const MENU_STATUT_LABELS = {
  [MENU_STATUTS.DISPONIBLE]: "Disponible",
  [MENU_STATUTS.INDISPONIBLE]: "Indisponible",
};

// Nom du bucket Storage pour les images
export const MENU_IMAGES_BUCKET = "menu-images";

// Taille max des images (5 MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Formats d'image autorisés
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// ============================================================================
// GESTION DES IMAGES (SUPABASE STORAGE)
// ============================================================================

/**
 * Uploader une image de menu vers Supabase Storage
 * @param {File} file - Fichier image à uploader
 * @param {string} menuId - ID du menu (optionnel, généré si non fourni)
 * @returns {Promise<{url, path, error}>}
 */
export const uploadMenuImage = async (file, menuId = null) => {
  try {
    console.group("📤 uploadMenuImage");
    console.log("Fichier:", file.name, file.type, file.size);

    // Validation du fichier
    if (!file) {
      console.error("Aucun fichier fourni");
      console.groupEnd();
      return {
        url: null,
        path: null,
        error: new Error("Aucun fichier fourni"),
      };
    }

    // Vérifier le type MIME
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      console.error("Type de fichier non autorisé:", file.type);
      console.groupEnd();
      return {
        url: null,
        path: null,
        error: new Error(
          `Type de fichier non autorisé. Formats acceptés: ${ALLOWED_IMAGE_TYPES.join(
            ", "
          )}`
        ),
      };
    }

    // Vérifier la taille
    if (file.size > MAX_IMAGE_SIZE) {
      console.error("Fichier trop volumineux:", file.size);
      console.groupEnd();
      return {
        url: null,
        path: null,
        error: new Error(
          `Fichier trop volumineux (max ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`
        ),
      };
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const fileName = menuId
      ? `${menuId}_${timestamp}.${extension}`
      : `menu_${timestamp}_${randomString}.${extension}`;

    console.log("Nom du fichier:", fileName);

    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Erreur lors de l'upload:", error);
      console.groupEnd();
      return { url: null, path: null, error };
    }

    // Obtenir l'URL publique
    const {
      data: { publicUrl },
    } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(data.path);

    console.log("Image uploadée:", publicUrl);
    console.groupEnd();

    return { url: publicUrl, path: data.path, error: null };
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
    console.groupEnd();
    return { url: null, path: null, error };
  }
};

/**
 * Supprimer une image de menu depuis Supabase Storage
 * @param {string} imageUrl - URL de l'image à supprimer
 * @returns {Promise<{success, error}>}
 */
export const deleteMenuImage = async (imageUrl) => {
  try {
    console.group("🗑️ deleteMenuImage");
    console.log("URL:", imageUrl);

    if (!imageUrl) {
      console.warn("Aucune URL fournie");
      console.groupEnd();
      return { success: true, error: null };
    }

    // Extraire le path depuis l'URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/menu-images/{path}
    const urlParts = imageUrl.split(`${MENU_IMAGES_BUCKET}/`);
    if (urlParts.length < 2) {
      console.error("URL invalide:", imageUrl);
      console.groupEnd();
      return { success: false, error: new Error("URL d'image invalide") };
    }

    const filePath = urlParts[1];
    console.log("Chemin du fichier:", filePath);

    // Supprimer le fichier
    const { error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("Erreur lors de la suppression:", error);
      console.groupEnd();
      return { success: false, error };
    }

    console.log("Image supprimée avec succès");
    console.groupEnd();
    return { success: true, error: null };
  } catch (error) {
    console.error("Exception lors de la suppression:", error);
    console.groupEnd();
    return { success: false, error };
  }
};

// ============================================================================
// CRUD - CREATE, READ, UPDATE, DELETE
// ============================================================================

/**
 * Créer un nouveau menu
 * @param {Object} menuData - Données du menu
 * @param {File} imageFile - Fichier image (optionnel)
 * @returns {Promise<{menu, error}>}
 */
export const createMenu = async (menuData, imageFile = null) => {
  try {
    console.group("➕ createMenu");
    console.log("Données:", menuData);

    // Validation côté client
    const { isValid, errors } = validateMenu(menuData);
    if (!isValid) {
      console.error("Validation échouée:", errors);
      console.groupEnd();
      return { menu: null, error: new Error(errors.join(", ")) };
    }

    let image_url = null;

    // Upload de l'image si fournie
    if (imageFile) {
      const { url, error: uploadError } = await uploadMenuImage(imageFile);
      if (uploadError) {
        console.error("Erreur lors de l'upload de l'image:", uploadError);
        console.groupEnd();
        return { menu: null, error: uploadError };
      }
      image_url = url;
    }

    // Préparer les données pour insertion
    const menuToInsert = {
      nom: menuData.nom,
      type: menuData.type,
      description: menuData.description,
      ingredients: menuData.ingredients || [],
      indice_calorique: menuData.indice_calorique || {
        joule: 0.0,
        calorie: 0.0,
      },
      prix: menuData.prix || 0.0,
      statut: menuData.statut || MENU_STATUTS.INDISPONIBLE,
      image_url,
    };

    // Insérer dans la base de données
    const { data, error } = await supabase
      .from("menus")
      .insert([menuToInsert])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création:", error);

      // Supprimer l'image uploadée en cas d'erreur
      if (image_url) {
        await deleteMenuImage(image_url);
      }

      console.groupEnd();
      return { menu: null, error };
    }

    console.log("Menu créé:", data);
    console.groupEnd();
    return { menu: data, error: null };
  } catch (error) {
    console.error("Exception lors de la création:", error);
    console.groupEnd();
    return { menu: null, error };
  }
};

/**
 * Récupérer tous les menus
 * @param {Object} options - Options de récupération (orderBy, limit)
 * @returns {Promise<{menus, error}>}
 */
export const getMenus = async (options = {}) => {
  try {
    console.group("📋 getMenus");
    console.log("Options:", options);

    let query = supabase.from("menus").select("*");

    // Tri
    if (options.orderBy) {
      const { column, ascending } = options.orderBy;
      query = query.order(column, { ascending });
    } else {
      // Tri par défaut: type puis nom
      query = query
        .order("type", { ascending: true })
        .order("nom", { ascending: true });
    }

    // Limite
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors de la récupération:", error);
      console.groupEnd();
      return { menus: [], error };
    }

    console.log(`${data.length} menus récupérés`);
    console.groupEnd();
    return { menus: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la récupération:", error);
    console.groupEnd();
    return { menus: [], error };
  }
};

/**
 * Récupérer un menu par son ID
 * @param {string} menuId - ID du menu
 * @returns {Promise<{menu, error}>}
 */
export const getMenuById = async (menuId) => {
  try {
    console.group("🔍 getMenuById");
    console.log("ID:", menuId);

    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("id", menuId)
      .single();

    if (error) {
      console.error("Erreur lors de la récupération:", error);
      console.groupEnd();
      return { menu: null, error };
    }

    console.log("Menu récupéré:", data);
    console.groupEnd();
    return { menu: data, error: null };
  } catch (error) {
    console.error("Exception lors de la récupération:", error);
    console.groupEnd();
    return { menu: null, error };
  }
};

/**
 * Mettre à jour un menu
 * @param {string} menuId - ID du menu
 * @param {Object} updates - Mises à jour
 * @param {File} newImageFile - Nouvelle image (optionnel)
 * @returns {Promise<{menu, error}>}
 */
export const updateMenu = async (menuId, updates, newImageFile = null) => {
  try {
    console.group("✏️ updateMenu");
    console.log("ID:", menuId);
    console.log("Updates:", updates);

    // Récupérer le menu actuel
    const { menu: currentMenu, error: fetchError } = await getMenuById(menuId);
    if (fetchError) {
      console.error("Erreur lors de la récupération du menu:", fetchError);
      console.groupEnd();
      return { menu: null, error: fetchError };
    }

    let newImageUrl = currentMenu.image_url;
    let oldImageUrl = null;

    // Upload de la nouvelle image si fournie
    if (newImageFile) {
      oldImageUrl = currentMenu.image_url;

      const { url, error: uploadError } = await uploadMenuImage(
        newImageFile,
        menuId
      );
      if (uploadError) {
        console.error(
          "Erreur lors de l'upload de la nouvelle image:",
          uploadError
        );
        console.groupEnd();
        return { menu: null, error: uploadError };
      }

      newImageUrl = url;
    }

    // Préparer les mises à jour
    const updatesToApply = {
      ...updates,
      image_url: newImageUrl,
    };

    // Mettre à jour dans la base de données
    const { data, error } = await supabase
      .from("menus")
      .update(updatesToApply)
      .eq("id", menuId)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour:", error);

      // Supprimer la nouvelle image en cas d'erreur
      if (newImageFile && newImageUrl) {
        await deleteMenuImage(newImageUrl);
      }

      console.groupEnd();
      return { menu: null, error };
    }

    // Supprimer l'ancienne image si une nouvelle a été uploadée
    if (oldImageUrl && newImageFile) {
      await deleteMenuImage(oldImageUrl);
    }

    console.log("Menu mis à jour:", data);
    console.groupEnd();
    return { menu: data, error: null };
  } catch (error) {
    console.error("Exception lors de la mise à jour:", error);
    console.groupEnd();
    return { menu: null, error };
  }
};

/**
 * Supprimer un menu
 * @param {string} menuId - ID du menu
 * @returns {Promise<{success, error}>}
 */
export const deleteMenu = async (menuId) => {
  try {
    console.group("🗑️ deleteMenu");
    console.log("ID:", menuId);

    // Récupérer le menu pour obtenir l'URL de l'image
    const { menu, error: fetchError } = await getMenuById(menuId);
    if (fetchError) {
      console.error("Erreur lors de la récupération du menu:", fetchError);
      console.groupEnd();
      return { success: false, error: fetchError };
    }

    // Supprimer le menu de la base de données
    const { error } = await supabase.from("menus").delete().eq("id", menuId);

    if (error) {
      console.error("Erreur lors de la suppression:", error);
      console.groupEnd();
      return { success: false, error };
    }

    // Supprimer l'image associée si elle existe
    if (menu.image_url) {
      await deleteMenuImage(menu.image_url);
    }

    console.log("Menu supprimé avec succès");
    console.groupEnd();
    return { success: true, error: null };
  } catch (error) {
    console.error("Exception lors de la suppression:", error);
    console.groupEnd();
    return { success: false, error };
  }
};

// ============================================================================
// FILTRAGE ET RECHERCHE
// ============================================================================

/**
 * Filtrer les menus par type et/ou statut
 * @param {Object} filters - Filtres { type?, statut? }
 * @returns {Promise<{menus, error}>}
 */
export const filterMenus = async (filters = {}) => {
  try {
    console.group("🔍 filterMenus");
    console.log("Filtres:", filters);

    let query = supabase.from("menus").select("*");

    // Filtre par type
    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    // Filtre par statut
    if (filters.statut) {
      query = query.eq("statut", filters.statut);
    }

    // Tri par nom
    query = query.order("nom", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Erreur lors du filtrage:", error);
      console.groupEnd();
      return { menus: [], error };
    }

    console.log(`${data.length} menus filtrés`);
    console.groupEnd();
    return { menus: data || [], error: null };
  } catch (error) {
    console.error("Exception lors du filtrage:", error);
    console.groupEnd();
    return { menus: [], error };
  }
};

/**
 * Rechercher des menus par nom ou ingrédients
 * @param {string} searchTerm - Terme de recherche
 * @returns {Promise<{menus, error}>}
 */
export const searchMenus = async (searchTerm) => {
  try {
    console.group("🔎 searchMenus");
    console.log("Terme:", searchTerm);

    if (!searchTerm || searchTerm.trim() === "") {
      console.warn("Aucun terme de recherche fourni");
      console.groupEnd();
      return { menus: [], error: null };
    }

    const term = searchTerm.trim();

    // Rechercher dans le nom, la description et les ingrédients
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .or(
        `nom.ilike.%${term}%,` +
          `description.ilike.%${term}%,` +
          `ingredients.cs.{${term}}`
      )
      .order("nom", { ascending: true });

    if (error) {
      console.error("Erreur lors de la recherche:", error);
      console.groupEnd();
      return { menus: [], error };
    }

    console.log(`${data.length} résultats trouvés`);
    console.groupEnd();
    return { menus: data || [], error: null };
  } catch (error) {
    console.error("Exception lors de la recherche:", error);
    console.groupEnd();
    return { menus: [], error };
  }
};

// ============================================================================
// EXPORTS CSV/JSON
// ============================================================================

/**
 * Exporter les menus au format CSV
 * @param {Array} menus - Liste des menus
 * @param {string} filename - Nom du fichier
 */
export const exportMenusToCSV = (menus, filename = null) => {
  try {
    console.group("💾 exportMenusToCSV");
    console.log(`Export de ${menus.length} menus`);

    // En-têtes CSV
    const headers = [
      "ID",
      "Nom",
      "Type",
      "Description",
      "Ingrédients",
      "Calories (cal)",
      "Joules (J)",
      "Prix (FCFA)",
      "Statut",
      "Image URL",
      "Date Création",
    ];

    // Convertir les menus en lignes CSV
    const rows = menus.map((menu) => [
      menu.id,
      menu.nom,
      MENU_TYPE_LABELS[menu.type] || menu.type,
      menu.description,
      (menu.ingredients || []).join("; "),
      menu.indice_calorique?.calorie || 0,
      menu.indice_calorique?.joule || 0,
      menu.prix,
      MENU_STATUT_LABELS[menu.statut] || menu.statut,
      menu.image_url || "",
      new Date(menu.created_at).toLocaleString("fr-FR"),
    ]);

    // Construire le CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const finalFilename =
      filename || `menus_${new Date().toISOString().split("T")[0]}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", finalFilename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("Export CSV terminé:", finalFilename);
    console.groupEnd();
  } catch (error) {
    console.error("Erreur lors de l'export CSV:", error);
    console.groupEnd();
  }
};

/**
 * Exporter les menus au format JSON
 * @param {Array} menus - Liste des menus
 * @param {string} filename - Nom du fichier
 */
export const exportMenusToJSON = (menus, filename = null) => {
  try {
    console.group("💾 exportMenusToJSON");
    console.log(`Export de ${menus.length} menus`);

    // Construire le JSON
    const jsonContent = JSON.stringify(menus, null, 2);

    // Télécharger le fichier
    const blob = new Blob([jsonContent], {
      type: "application/json;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const finalFilename =
      filename || `menus_${new Date().toISOString().split("T")[0]}.json`;

    link.setAttribute("href", url);
    link.setAttribute("download", finalFilename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log("Export JSON terminé:", finalFilename);
    console.groupEnd();
  } catch (error) {
    console.error("Erreur lors de l'export JSON:", error);
    console.groupEnd();
  }
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Valider les données d'un menu (côté client)
 * @param {Object} menuData - Données du menu
 * @returns {{isValid: boolean, errors: string[]}}
 */
export const validateMenu = (menuData) => {
  const errors = [];

  // Nom obligatoire
  if (!menuData.nom || menuData.nom.trim() === "") {
    errors.push("Le nom est obligatoire");
  }

  // Type obligatoire et valide
  if (!menuData.type) {
    errors.push("Le type est obligatoire");
  } else if (!Object.values(MENU_TYPES).includes(menuData.type)) {
    errors.push(
      `Type invalide. Types acceptés: ${Object.values(MENU_TYPES).join(", ")}`
    );
  }

  // Description obligatoire
  if (!menuData.description || menuData.description.trim() === "") {
    errors.push("La description est obligatoire");
  }

  // Prix doit être un nombre positif
  if (menuData.prix !== undefined && menuData.prix !== null) {
    const prix = Number(menuData.prix);
    if (isNaN(prix) || prix < 0) {
      errors.push("Le prix doit être un nombre positif ou zéro");
    }
  }

  // Statut doit être valide si fourni
  if (
    menuData.statut &&
    !Object.values(MENU_STATUTS).includes(menuData.statut)
  ) {
    errors.push(
      `Statut invalide. Statuts acceptés: ${Object.values(MENU_STATUTS).join(
        ", "
      )}`
    );
  }

  // Ingrédients doit être un tableau si fourni
  if (menuData.ingredients && !Array.isArray(menuData.ingredients)) {
    errors.push("Les ingrédients doivent être un tableau");
  }

  // Indice calorique doit avoir les bonnes propriétés si fourni
  if (menuData.indice_calorique) {
    const indice = menuData.indice_calorique;
    if (
      typeof indice.joule !== "number" ||
      typeof indice.calorie !== "number"
    ) {
      errors.push(
        "L'indice calorique doit contenir les propriétés 'joule' et 'calorie' (nombres)"
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * Vérifier si un utilisateur peut gérer les menus
 * @param {string} userRole - Rôle de l'utilisateur
 * @param {string} action - Action à effectuer (create, update, delete)
 * @returns {boolean}
 */
export const canManageMenus = (userRole, action) => {
  const allowedRoles = {
    create: ["admin", "superviseur"],
    update: ["admin", "superviseur"],
    delete: ["admin"],
  };

  const roles = allowedRoles[action] || [];
  return roles.includes(userRole);
};

// ============================================================================
// STATISTIQUES UTILITAIRES
// ============================================================================

/**
 * Obtenir des statistiques sur les menus
 * @param {Array} menus - Liste des menus
 * @returns {Object}
 */
export const getMenusStats = (menus) => {
  const stats = {
    total: menus.length,
    disponibles: menus.filter((m) => m.statut === MENU_STATUTS.DISPONIBLE)
      .length,
    indisponibles: menus.filter((m) => m.statut === MENU_STATUTS.INDISPONIBLE)
      .length,
    par_type: {},
    prix_moyen: 0,
  };

  // Stats par type
  Object.values(MENU_TYPES).forEach((type) => {
    stats.par_type[type] = menus.filter((m) => m.type === type).length;
  });

  // Prix moyen
  const menusAvecPrix = menus.filter((m) => m.prix > 0);
  if (menusAvecPrix.length > 0) {
    stats.prix_moyen =
      menusAvecPrix.reduce((sum, m) => sum + m.prix, 0) / menusAvecPrix.length;
  }

  return stats;
};

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default {
  // Constantes
  MENU_TYPES,
  MENU_STATUTS,
  MENU_TYPE_LABELS,
  MENU_STATUT_LABELS,
  MENU_IMAGES_BUCKET,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,

  // Gestion images
  uploadMenuImage,
  deleteMenuImage,

  // CRUD
  createMenu,
  getMenus,
  getMenuById,
  updateMenu,
  deleteMenu,

  // Filtrage et recherche
  filterMenus,
  searchMenus,

  // Exports
  exportMenusToCSV,
  exportMenusToJSON,

  // Validation et permissions
  validateMenu,
  canManageMenus,

  // Statistiques
  getMenusStats,
};
