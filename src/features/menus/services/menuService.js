import { supabase } from "@/lib/supabase";
import {
  createPromotionTemplate,
  activatePromotionTemplate,
  generateCodePromo,
  validatePromotionTemplateData,
  deletePromotionTemplate,
  cancelPromotionInstance,
} from "@/features/promotions/utils/promotionToolkit";

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

export const MENU_IMAGES_BUCKET = "menu-images";
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const uploadMenuImage = async (file, menuId = null) => {
  try {
    if (!file) {
      return { url: null, path: null, error: new Error("Aucun fichier fourni") };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        url: null,
        path: null,
        error: new Error(
          `Type de fichier non autorisé. Formats acceptés: ${ALLOWED_IMAGE_TYPES.join(", ")}`
        ),
      };
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return {
        url: null,
        path: null,
        error: new Error(`Fichier trop volumineux (max ${MAX_IMAGE_SIZE / 1024 / 1024} MB)`),
      };
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const fileName = menuId
      ? `${menuId}_${timestamp}.${extension}`
      : `menu_${timestamp}_${randomString}.${extension}`;

    const { data, error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (error) {
      return { url: null, path: null, error };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(data.path);

    return { url: publicUrl, path: data.path, error: null };
  } catch (error) {
    return { url: null, path: null, error };
  }
};

export const deleteMenuImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      return { success: true, error: null };
    }

    const urlParts = imageUrl.split(`${MENU_IMAGES_BUCKET}/`);
    if (urlParts.length < 2) {
      return { success: false, error: new Error("URL d'image invalide") };
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(MENU_IMAGES_BUCKET)
      .remove([filePath]);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};

export const createMenu = async (menuData, imageFile = null) => {
  try {
    const { isValid, errors } = validateMenu(menuData);
    if (!isValid) {
      return { menu: null, error: new Error(errors.join(", ")) };
    }

    let image_url = null;

    if (imageFile) {
      const { url, error: uploadError } = await uploadMenuImage(imageFile);
      if (uploadError) {
        return { menu: null, error: uploadError };
      }
      image_url = url;
    }

    const menuToInsert = {
      nom: menuData.nom,
      type: menuData.type,
      description: menuData.description,
      ingredients: menuData.ingredients || [],
      indice_calorique: menuData.indice_calorique || { joule: 0.0, calorie: 0.0 },
      prix: menuData.prix || 0.0,
      statut: menuData.statut || MENU_STATUTS.INDISPONIBLE,
      image_url,
    };

    const { data, error } = await supabase
      .from("menus")
      .insert([menuToInsert])
      .select()
      .single();

    if (error) {
      if (image_url) {
        await deleteMenuImage(image_url);
      }
      return { menu: null, error };
    }

    return { menu: data, error: null };
  } catch (error) {
    return { menu: null, error };
  }
};

export const getMenus = async (options = {}) => {
  try {
    let query = supabase.from("menus").select("*");

    if (options.orderBy) {
      const { column, ascending } = options.orderBy;
      query = query.order(column, { ascending });
    } else {
      query = query
        .order("type", { ascending: true })
        .order("nom", { ascending: true });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return { menus: [], error };
    }

    return { menus: data || [], error: null };
  } catch (error) {
    return { menus: [], error };
  }
};

export const getMenuById = async (menuId) => {
  try {
    const { data, error } = await supabase
      .from("menus")
      .select("*")
      .eq("id", menuId)
      .single();

    if (error) {
      return { menu: null, error };
    }

    return { menu: data, error: null };
  } catch (error) {
    return { menu: null, error };
  }
};

export const updateMenu = async (menuId, updates, newImageFile = null) => {
  try {
    const { menu: currentMenu, error: fetchError } = await getMenuById(menuId);
    if (fetchError) {
      return { menu: null, error: fetchError };
    }

    let newImageUrl = currentMenu.image_url;
    let oldImageUrl = null;

    if (newImageFile) {
      oldImageUrl = currentMenu.image_url;

      const { url, error: uploadError } = await uploadMenuImage(newImageFile, menuId);
      if (uploadError) {
        return { menu: null, error: uploadError };
      }

      newImageUrl = url;
    }

    const updatesToApply = {
      ...updates,
      image_url: newImageUrl,
    };

    const { data, error } = await supabase
      .from("menus")
      .update(updatesToApply)
      .eq("id", menuId)
      .select()
      .single();

    if (error) {
      if (newImageFile && newImageUrl) {
        await deleteMenuImage(newImageUrl);
      }
      return { menu: null, error };
    }

    if (oldImageUrl && newImageFile) {
      await deleteMenuImage(oldImageUrl);
    }

    return { menu: data, error: null };
  } catch (error) {
    return { menu: null, error };
  }
};

export const deleteMenu = async (menuId) => {
  try {
    const { menu, error: fetchError } = await getMenuById(menuId);
    if (fetchError) {
      return { success: false, error: fetchError };
    }

    const { error } = await supabase.from("menus").delete().eq("id", menuId);

    if (error) {
      return { success: false, error };
    }

    if (menu.image_url) {
      await deleteMenuImage(menu.image_url);
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
};

export const filterMenus = async (filters = {}) => {
  try {
    let query = supabase.from("menus").select("*");

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.statut) {
      query = query.eq("statut", filters.statut);
    }

    query = query.order("nom", { ascending: true });

    const { data, error } = await query;

    if (error) {
      return { menus: [], error };
    }

    return { menus: data || [], error: null };
  } catch (error) {
    return { menus: [], error };
  }
};

export const searchMenus = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === "") {
      return { menus: [], error: null };
    }

    const term = searchTerm.trim();

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
      return { menus: [], error };
    }

    return { menus: data || [], error: null };
  } catch (error) {
    return { menus: [], error };
  }
};

export const exportMenusToCSV = (menus, filename = null) => {
  try {
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

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

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
  } catch (error) {
    // silently ignore export errors
  }
};

export const exportMenusToJSON = (menus, filename = null) => {
  try {
    const jsonContent = JSON.stringify(menus, null, 2);

    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
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
  } catch (error) {
    // silently ignore export errors
  }
};

export const validateMenu = (menuData) => {
  const errors = [];

  if (!menuData.nom || menuData.nom.trim() === "") {
    errors.push("Le nom est obligatoire");
  }

  if (!menuData.type) {
    errors.push("Le type est obligatoire");
  } else if (!Object.values(MENU_TYPES).includes(menuData.type)) {
    errors.push(
      `Type invalide. Types acceptés: ${Object.values(MENU_TYPES).join(", ")}`
    );
  }

  if (!menuData.description || menuData.description.trim() === "") {
    errors.push("La description est obligatoire");
  }

  if (menuData.prix !== undefined && menuData.prix !== null) {
    const prix = Number(menuData.prix);
    if (isNaN(prix) || prix < 0) {
      errors.push("Le prix doit être un nombre positif ou zéro");
    }
  }

  if (
    menuData.statut &&
    !Object.values(MENU_STATUTS).includes(menuData.statut)
  ) {
    errors.push(
      `Statut invalide. Statuts acceptés: ${Object.values(MENU_STATUTS).join(", ")}`
    );
  }

  if (menuData.ingredients && !Array.isArray(menuData.ingredients)) {
    errors.push("Les ingrédients doivent être un tableau");
  }

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

export const canManageMenus = (userRole, action) => {
  const allowedRoles = {
    create: ["admin", "superviseur"],
    update: ["admin", "superviseur"],
    delete: ["admin"],
  };

  const roles = allowedRoles[action] || [];
  return roles.includes(userRole);
};

export const getMenusStats = (menus) => {
  const stats = {
    total: menus.length,
    disponibles: menus.filter((m) => m.statut === MENU_STATUTS.DISPONIBLE).length,
    indisponibles: menus.filter((m) => m.statut === MENU_STATUTS.INDISPONIBLE).length,
    par_type: {},
    prix_moyen: 0,
  };

  Object.values(MENU_TYPES).forEach((type) => {
    stats.par_type[type] = menus.filter((m) => m.type === type).length;
  });

  const menusAvecPrix = menus.filter((m) => m.prix > 0);
  if (menusAvecPrix.length > 0) {
    stats.prix_moyen =
      menusAvecPrix.reduce((sum, m) => sum + m.prix, 0) / menusAvecPrix.length;
  }

  return stats;
};

export const validateMenuPromo = (menuData, promoData) => {
  const { isValid: menuValid, errors: menuErrors } = validateMenu(menuData);
  const { valid: promoValid, errors: promoErrors } =
    validatePromotionTemplateData(promoData);

  return {
    isValid: menuValid && promoValid,
    menuErrors,
    promoErrors,
  };
};

export const createMenuPromo = async (menuData, promoData, imageFile = null) => {
  try {
    const { isValid, menuErrors, promoErrors } = validateMenuPromo(
      menuData,
      promoData
    );

    if (!isValid) {
      const allErrors = [
        ...menuErrors,
        ...Object.values(promoErrors),
      ].filter(Boolean);
      return {
        menu: null,
        template: null,
        instance: null,
        error: new Error(allErrors.join(", ")),
      };
    }

    let image_url = null;
    if (imageFile) {
      const { url, error: uploadError } = await uploadMenuImage(imageFile);
      if (uploadError) {
        return { menu: null, template: null, instance: null, error: uploadError };
      }
      image_url = url;
    }

    const templateData = {
      denomination: promoData.denomination || `Promo - ${menuData.nom}`,
      description: promoData.description || menuData.description,
      type_promotion: promoData.type_promotion,
      reduction_absolue: promoData.reduction_absolue || 0,
      reduction_relative: promoData.reduction_relative || 0,
      duree_valeur: promoData.duree_valeur,
      duree_unite: promoData.duree_unite,
      eligibilite: promoData.eligibilite || { type: "tous" },
      utilisation_max: promoData.utilisation_max || null,
      utilisation_max_par_client: promoData.utilisation_max_par_client || 1,
      is_recurrente: false,
    };

    const { success: templateSuccess, template, error: templateError } =
      await createPromotionTemplate(templateData);

    if (!templateSuccess || !template) {
      if (image_url) await deleteMenuImage(image_url);
      return {
        menu: null,
        template: null,
        instance: null,
        error: new Error(templateError || "Erreur création template promotion"),
      };
    }

    const codePromo =
      promoData.code_promo && promoData.code_promo.trim()
        ? promoData.code_promo.trim().toUpperCase()
        : generateCodePromo("MENU");

    const { success: instanceSuccess, instance, error: instanceError } =
      await activatePromotionTemplate(template.id, {
        date_debut: new Date().toISOString(),
        code_promo: codePromo,
      });

    if (!instanceSuccess || !instance) {
      await deletePromotionTemplate(template.id);
      if (image_url) await deleteMenuImage(image_url);
      return {
        menu: null,
        template: null,
        instance: null,
        error: new Error(instanceError || "Erreur activation promotion"),
      };
    }

    const menuToInsert = {
      nom: menuData.nom,
      type: menuData.type,
      description: menuData.description,
      ingredients: menuData.ingredients || [],
      indice_calorique: menuData.indice_calorique || { joule: 0.0, calorie: 0.0 },
      prix: menuData.prix || 0.0,
      statut: menuData.statut || MENU_STATUTS.DISPONIBLE,
      image_url,
      is_promo: true,
      promotion_id: instance.id,
    };

    const { data: menuResult, error: menuError } = await supabase
      .from("menus")
      .insert([menuToInsert])
      .select()
      .single();

    if (menuError) {
      await cancelPromotionInstance(instance.id, "Rollback: erreur création menu");
      await deletePromotionTemplate(template.id);
      if (image_url) await deleteMenuImage(image_url);
      return {
        menu: null,
        template: null,
        instance: null,
        error: menuError,
      };
    }

    return {
      menu: menuResult,
      template,
      instance,
      error: null,
    };
  } catch (error) {
    return { menu: null, template: null, instance: null, error };
  }
};
