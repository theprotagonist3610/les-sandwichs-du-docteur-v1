/**
 * ProductionAnalyzer.js
 * Plugin d'analyse des productions.
 *
 * Sources : productionToolkit
 * Règles :
 *  - Aucune production planifiée pour demain (H24)
 *  - Productions en cours non terminées (H24)
 *  - Schémas avec rendement réel faible vs estimé (J7)
 *  - Coût de production en dérive sur le mois (MOIS)
 */

import {
  getDashboardProductions,
  getProductions,
  getSchemas,
  STATUTS_PRODUCTION,
} from "@/utils/productionToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils ───────────────────────────────────────────────────────────────────

const SEUIL_RENDEMENT_FAIBLE = 0.80; // < 80 % du rendement estimé → alerte
const SEUIL_DERIVE_COUT      = 0.15; // +15 % coût réel vs estimé → alerte

// ─── Helpers date ─────────────────────────────────────────────────────────────

const today    = () => new Date().toISOString().slice(0, 10);
const demain   = () => new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
const ilYa7j   = () => new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
const debutMois = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

// ─── Règles ───────────────────────────────────────────────────────────────────

async function analyserPlanificationJ1(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const { success, productions } = await getProductions({
    startDate: demain(),
    endDate:   demain(),
    statut:    STATUTS_PRODUCTION.PLANIFIEE,
  });

  if (!success) return insights;

  if (!productions || productions.length === 0) {
    // Vérifie s'il y a des schémas actifs (production possible)
    const schemasResult = await getSchemas({ actifSeulement: true });
    const nbSchemas = schemasResult.success ? (schemasResult.schemas?.length ?? 0) : 0;

    insights.push(createInsight({
      id:          "production_aucune_planifiee_j1",
      source:      "ProductionAnalyzer",
      categorie:   CATEGORIES.PRODUCTION,
      horizon,
      priorite:    nbSchemas > 0 ? PRIORITES.MOYENNE : PRIORITES.INFO,
      titre:       "Aucune production planifiée pour demain",
      description: nbSchemas > 0
        ? `${nbSchemas} schéma(s) de production disponible(s) mais aucune production n'est planifiée pour demain. Anticipez les besoins du lendemain.`
        : "Aucune production n'est planifiée pour demain et aucun schéma actif n'existe. Créez des schémas de production.",
      actions: [{ label: "Planifier une production", path: "/productions" }],
      meta: { nbSchemas },
    }));
  }

  return insights;
}

async function analyserProductionsEnCours(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const { success, productions } = await getProductions({
    startDate: today(),
    endDate:   today(),
    statut:    STATUTS_PRODUCTION.EN_COURS,
  });

  if (!success || !productions || productions.length === 0) return insights;

  insights.push(createInsight({
    id:          "production_en_cours_non_terminees",
    source:      "ProductionAnalyzer",
    categorie:   CATEGORIES.PRODUCTION,
    horizon,
    priorite:    PRIORITES.MOYENNE,
    titre:       `${productions.length} production(s) en cours non terminée(s)`,
    description: `${productions.map((p) => p.nom).join(", ")} — ces productions ont été démarrées aujourd'hui mais ne sont pas encore clôturées. Mettez à jour leur statut.`,
    actions:     [{ label: "Voir les productions", path: "/productions" }],
    meta: { productions: productions.map((p) => ({ id: p.id, nom: p.nom })) },
  }));

  return insights;
}

async function analyserRendements(horizon) {
  if (horizon !== HORIZONS.J7) return [];
  const insights = [];

  const { success, productions } = await getProductions({
    startDate: ilYa7j(),
    endDate:   today(),
    statut:    STATUTS_PRODUCTION.TERMINEE,
  });

  if (!success || !productions || productions.length === 0) return insights;

  const sousRendement = productions.filter((p) => {
    const estime = p.schema?.rendement_estime ?? 0;
    const reel   = p.rendement_reel ?? 0;
    return estime > 0 && reel / estime < SEUIL_RENDEMENT_FAIBLE;
  });

  if (sousRendement.length === 0) return insights;

  insights.push(createInsight({
    id:          "production_rendement_faible",
    source:      "ProductionAnalyzer",
    categorie:   CATEGORIES.PRODUCTION,
    horizon,
    priorite:    PRIORITES.MOYENNE,
    titre:       `${sousRendement.length} production(s) sous le rendement estimé`,
    description: `Ces productions ont un rendement réel inférieur à ${SEUIL_RENDEMENT_FAIBLE * 100} % du rendement estimé : ${sousRendement.map((p) => p.nom).join(", ")}. Analysez les causes (ingrédients, processus).`,
    actions:     [{ label: "Voir les productions", path: "/productions" }],
    meta: { productions: sousRendement.map((p) => ({ nom: p.nom, taux: (p.rendement_reel / (p.schema?.rendement_estime ?? 1)) })) },
  }));

  return insights;
}

async function analyserDeriveCout(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const { success, productions } = await getProductions({
    startDate: debutMois(),
    endDate:   today(),
    statut:    STATUTS_PRODUCTION.TERMINEE,
  });

  if (!success || !productions || productions.length === 0) return insights;

  const avecEcart = productions.filter((p) => {
    const coutEstime = p.schema?.cout_estime ?? 0;
    const coutReel   = p.cout_total ?? 0;
    return coutEstime > 0 && (coutReel - coutEstime) / coutEstime >= SEUIL_DERIVE_COUT;
  });

  if (avecEcart.length === 0) return insights;

  const ecartMoyen = avecEcart.reduce((sum, p) => {
    const estime = p.schema?.cout_estime ?? 1;
    const reel   = p.cout_total ?? 0;
    return sum + (reel - estime) / estime;
  }, 0) / avecEcart.length;

  insights.push(createInsight({
    id:          "production_derive_cout",
    source:      "ProductionAnalyzer",
    categorie:   CATEGORIES.PRODUCTION,
    horizon,
    priorite:    PRIORITES.HAUTE,
    titre:       "Coûts de production en dérive ce mois",
    description: `${avecEcart.length} production(s) affichent un coût réel supérieur de ${Math.round(ecartMoyen * 100)} % au coût estimé en moyenne. Revoyez les schémas ou les prix des ingrédients.`,
    actions:     [{ label: "Voir les productions", path: "/productions" }],
    meta: { avecEcart: avecEcart.map((p) => p.nom), ecartMoyen },
  }));

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const ProductionAnalyzer = {
  name: "ProductionAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [planif, enCours, rendements, cout] = await Promise.allSettled([
      analyserPlanificationJ1(horizon),
      analyserProductionsEnCours(horizon),
      analyserRendements(horizon),
      analyserDeriveCout(horizon),
    ]);

    return [
      ...(planif.status     === "fulfilled" ? planif.value     : []),
      ...(enCours.status    === "fulfilled" ? enCours.value    : []),
      ...(rendements.status === "fulfilled" ? rendements.value : []),
      ...(cout.status       === "fulfilled" ? cout.value       : []),
    ];
  },
};

export default ProductionAnalyzer;
