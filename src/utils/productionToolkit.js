/**
 * productionToolkit.js
 * CRUD Supabase + utilitaires de calcul pour les 3 recettes fixes.
 */

import { supabase } from "@/config/supabase";

// ─── Constantes ───────────────────────────────────────────────────────────────

export const RECETTES_IDS = ["viande", "poisson", "yaourt"];

export const RECETTE_LABELS = {
  viande:  "Farce de Viande",
  poisson: "Farce de Poisson",
  yaourt:  "Yaourt",
};

export const RECETTE_COLORS = {
  viande:  "#dc2626",
  poisson: "#0ea5e9",
  yaourt:  "#f59e0b",
};

export const RECETTE_ICONS = {
  viande:  "🥩",
  poisson: "🐟",
  yaourt:  "🥛",
};

// ─── Calculs ──────────────────────────────────────────────────────────────────

export const calculerCoutTotal = (ingredientPrincipal, ingredientsSecondaires = []) => {
  const coutP = Number(ingredientPrincipal?.cout_total ?? 0);
  const coutS = ingredientsSecondaires.reduce((s, i) => s + Number(i.cout_total ?? 0), 0);
  return Math.round((coutP + coutS) * 100) / 100;
};

export const calculerRendement = (qteProduite, qteIngredientPrincipal) => {
  const qte = Number(qteIngredientPrincipal ?? 0);
  if (!qte) return 0;
  return Math.round((Number(qteProduite) / qte) * 1000) / 10;
};

export const calculerPrixVente = (qteProduite, prixParUnite) => {
  return Math.round(Number(qteProduite) * Number(prixParUnite));
};

export const calculerMarge = (prixVente, coutTotal) => {
  return Math.round((Number(prixVente) - Number(coutTotal)) * 100) / 100;
};

export const initIngredientsPrincipaux = (recette, overrides = {}) => ({
  qte_utilisee:     overrides.qte_utilisee     ?? "",
  cout_unitaire_reel: overrides.cout_unitaire_reel ?? "",
  cout_total:       overrides.cout_total       ?? 0,
});

export const initIngredientsSecondaires = (recette, overridesArr = []) =>
  (recette?.ingredients_secondaires ?? []).map((ing, i) => {
    const ov = overridesArr[i] ?? {};
    return {
      nom:               ing.nom,
      unite:             ing.unite,
      qte_utilisee:      ov.qte_utilisee      ?? "",
      cout_unitaire_reel: ov.cout_unitaire_reel ?? ing.cout_estime_unitaire ?? "",
      cout_total:        ov.cout_total        ?? 0,
    };
  });

// ─── Recettes ─────────────────────────────────────────────────────────────────

export const getRecettes = async () => {
  const { data, error } = await supabase
    .from("recettes")
    .select("*")
    .order("id");
  if (error) return { success: false, error: error.message };
  return { success: true, recettes: data ?? [] };
};

export const updateRecette = async (id, updates) => {
  const { data, error } = await supabase
    .from("recettes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, recette: data };
};

// ─── Productions ─────────────────────────────────────────────────────────────

const PROD_SELECT = `
  id, recette_id, date_production,
  ingredient_principal, ingredients_secondaires,
  cout_total_reel, qte_produite_reelle, rendement_reel_pct,
  prix_vente_estime, marge_estimee, notes, created_at,
  recette:recettes(id, nom, rendement_estime_pct, prix_vente_par_unite_produite, ingredient_principal)
`;

export const getProductions = async ({ recetteId, startDate, endDate, limit = 200 } = {}) => {
  let q = supabase
    .from("productions")
    .select(PROD_SELECT)
    .order("date_production", { ascending: false })
    .order("created_at",      { ascending: false })
    .limit(limit);

  if (recetteId) q = q.eq("recette_id", recetteId);
  if (startDate) q = q.gte("date_production", startDate);
  if (endDate)   q = q.lte("date_production", endDate);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, productions: data ?? [] };
};

export const createProduction = async (payload) => {
  const {
    recette_id, date_production,
    ingredient_principal, ingredients_secondaires,
    qte_produite_reelle, notes, recette,
  } = payload;

  const cout_total_reel   = calculerCoutTotal(ingredient_principal, ingredients_secondaires);
  const rendement_reel_pct = calculerRendement(qte_produite_reelle, ingredient_principal?.qte_utilisee);
  const prix_vente_estime  = calculerPrixVente(qte_produite_reelle, recette?.prix_vente_par_unite_produite ?? 0);
  const marge_estimee      = calculerMarge(prix_vente_estime, cout_total_reel);

  const { data, error } = await supabase
    .from("productions")
    .insert({
      recette_id,
      date_production,
      ingredient_principal,
      ingredients_secondaires: ingredients_secondaires ?? [],
      cout_total_reel,
      qte_produite_reelle: Number(qte_produite_reelle),
      rendement_reel_pct,
      prix_vente_estime,
      marge_estimee,
      notes: notes || null,
    })
    .select(PROD_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, production: data };
};

export const updateProduction = async (id, payload) => {
  const {
    recette_id, date_production,
    ingredient_principal, ingredients_secondaires,
    qte_produite_reelle, notes, recette,
  } = payload;

  const cout_total_reel    = calculerCoutTotal(ingredient_principal, ingredients_secondaires);
  const rendement_reel_pct = calculerRendement(qte_produite_reelle, ingredient_principal?.qte_utilisee);
  const prix_vente_estime  = calculerPrixVente(qte_produite_reelle, recette?.prix_vente_par_unite_produite ?? 0);
  const marge_estimee      = calculerMarge(prix_vente_estime, cout_total_reel);

  const { data, error } = await supabase
    .from("productions")
    .update({
      recette_id,
      date_production,
      ingredient_principal,
      ingredients_secondaires: ingredients_secondaires ?? [],
      cout_total_reel,
      qte_produite_reelle: Number(qte_produite_reelle),
      rendement_reel_pct,
      prix_vente_estime,
      marge_estimee,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PROD_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, production: data };
};

export const deleteProduction = async (id) => {
  const { error } = await supabase.from("productions").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
};

// ─── Formatage ────────────────────────────────────────────────────────────────

export const formatMontant = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(v ?? 0);

export const formatQte = (v, unite = "") =>
  `${(Number(v) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unite}`.trim();

export const formatDate = (d) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const formatRendement = (v) =>
  v != null ? `${Number(v).toFixed(1)} %` : "—";
