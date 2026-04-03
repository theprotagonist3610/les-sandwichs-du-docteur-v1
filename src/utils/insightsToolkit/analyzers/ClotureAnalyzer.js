/**
 * ClotureAnalyzer.js
 * Plugin d'analyse des clôtures journalières.
 *
 * Sources : dayClosureToolkit, backDaysToolkit
 * Règles :
 *  - Journée d'hier non clôturée (H24)
 *  - Journées des 7 derniers jours non clôturées (J7)
 *  - Écart significatif forecast vs réalisé hier (H24)
 *  - Journées sans clôture sur le mois (MOIS)
 *  - Heure de pointe récurrente pour anticiper les ressources (J7)
 */

import {
  getHistoricalClosures,
  generateDayForecast,
  getDayClosureByDate,
} from "@/utils/dayClosureToolkit";
import { getJourneesDisponibles, STATUTS_JOURNEE } from "@/utils/backDaysToolkit";
import { HORIZONS, PRIORITES, CATEGORIES, createInsight } from "../engine/insightTypes.js";

// ─── Seuils ───────────────────────────────────────────────────────────────────

const SEUIL_ECART_FORECAST    = 0.20; // ±20 % vs forecast → alerte
const SEUIL_JOURS_NON_CLOTURE = 3;   // 3+ jours non clôturés → alerte haute

// ─── Helpers date ─────────────────────────────────────────────────────────────

const today     = () => new Date().toISOString().slice(0, 10);
const hier      = () => new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
const ilYa7j    = () => new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
const debutMois = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

// ─── Règles ───────────────────────────────────────────────────────────────────

async function analyserClotureHier(horizon) {
  if (horizon !== HORIZONS.H24) return [];
  const insights = [];

  const { success, closure } = await getDayClosureByDate(hier());
  if (!success) return insights;

  if (!closure) {
    insights.push(createInsight({
      id:          "cloture_hier_manquante",
      source:      "ClotureAnalyzer",
      categorie:   CATEGORIES.CLOTURE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       "Journée d'hier non clôturée",
      description: "La clôture de la journée d'hier n'a pas été effectuée. Les métriques et le rapport journalier ne peuvent pas être générés.",
      actions:     [
        { label: "Clôturer via Back-Day", path: "/back-day" },
        { label: "Voir les clôtures",     path: "/rapports" },
      ],
      meta: { date: hier() },
    }));
    return insights;
  }

  // Écart forecast vs réalisé
  const forecastResult = await generateDayForecast();
  if (forecastResult?.success && forecastResult.forecast) {
    const caRealise  = closure.chiffre_affaires  ?? 0;
    const caForecast = forecastResult.forecast.chiffre_affaires ?? 0;

    if (caForecast > 0) {
      const ecart = (caRealise - caForecast) / caForecast;

      if (Math.abs(ecart) >= SEUIL_ECART_FORECAST) {
        insights.push(createInsight({
          id:          "cloture_ecart_forecast_hier",
          source:      "ClotureAnalyzer",
          categorie:   CATEGORIES.CLOTURE,
          horizon,
          priorite:    ecart < 0 ? PRIORITES.HAUTE : PRIORITES.INFO,
          titre:       ecart < 0
            ? "CA d'hier inférieur aux prévisions"
            : "CA d'hier supérieur aux prévisions",
          description: ecart < 0
            ? `Le CA réalisé hier (${caRealise.toLocaleString("fr-FR")} F) est inférieur de ${Math.round(Math.abs(ecart) * 100)} % aux prévisions (${caForecast.toLocaleString("fr-FR")} F). Identifiez les causes de ce sous-régime.`
            : `Excellente journée — CA réalisé (${caRealise.toLocaleString("fr-FR")} F) supérieur de ${Math.round(ecart * 100)} % aux prévisions (${caForecast.toLocaleString("fr-FR")} F).`,
          actions:     ecart < 0 ? [{ label: "Voir les statistiques", path: "/statistiques" }] : [],
          meta: { caRealise, caForecast, ecart },
        }));
      }
    }

    // Alerte heure de pointe pour anticiper aujourd'hui
    if (closure.heure_de_pointe) {
      insights.push(createInsight({
        id:          "cloture_heure_de_pointe_hier",
        source:      "ClotureAnalyzer",
        categorie:   CATEGORIES.CLOTURE,
        horizon,
        priorite:    PRIORITES.INFO,
        titre:       `Pic d'activité hier à ${closure.heure_de_pointe}h`,
        description: `L'heure de pointe d'hier était ${closure.heure_de_pointe}h avec ${closure.nombre_ventes_total ?? "?"} commandes au total. Anticipez les ressources pour aujourd'hui à cette même heure.`,
        actions:     [],
        meta: { heure: closure.heure_de_pointe, nbVentes: closure.nombre_ventes_total },
      }));
    }
  }

  return insights;
}

async function analyserClotures7j(horizon) {
  if (horizon !== HORIZONS.J7) return [];
  const insights = [];

  const { jours, error } = await getJourneesDisponibles(ilYa7j(), hier());
  if (error || !jours) return insights;

  const nonClotures = jours.filter((j) => j.etat !== STATUTS_JOURNEE.CLOTURE);

  if (nonClotures.length >= SEUIL_JOURS_NON_CLOTURE) {
    insights.push(createInsight({
      id:          "cloture_jours_manquants_7j",
      source:      "ClotureAnalyzer",
      categorie:   CATEGORIES.CLOTURE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       `${nonClotures.length} journée(s) non clôturée(s) sur 7 jours`,
      description: `Les jours suivants n'ont pas de clôture : ${nonClotures.map((j) => j.date).join(", ")}. Complétez ces clôtures pour garantir la fiabilité des rapports.`,
      actions:     [{ label: "Saisie rétroactive (Back-Day)", path: "/back-day" }],
      meta: { jours: nonClotures },
    }));
  } else if (nonClotures.length > 0) {
    insights.push(createInsight({
      id:          "cloture_quelques_jours_manquants",
      source:      "ClotureAnalyzer",
      categorie:   CATEGORIES.CLOTURE,
      horizon,
      priorite:    PRIORITES.MOYENNE,
      titre:       `${nonClotures.length} journée(s) à clôturer`,
      description: `${nonClotures.map((j) => j.date).join(", ")} — ces journées sont incomplètes ou sans clôture.`,
      actions:     [{ label: "Back-Day", path: "/back-day" }],
      meta: { jours: nonClotures },
    }));
  }

  // Analyse heure de pointe récurrente sur 7 jours
  const closures = await getHistoricalClosures(7);
  if (closures?.success && closures.closures?.length >= 3) {
    const heures = closures.closures
      .map((c) => c.heure_de_pointe)
      .filter(Boolean);

    if (heures.length > 0) {
      const freq = heures.reduce((acc, h) => { acc[h] = (acc[h] ?? 0) + 1; return acc; }, {});
      const heurePic = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

      if (heurePic && heurePic[1] >= 3) {
        insights.push(createInsight({
          id:          "cloture_heure_pointe_recurrente",
          source:      "ClotureAnalyzer",
          categorie:   CATEGORIES.CLOTURE,
          horizon,
          priorite:    PRIORITES.INFO,
          titre:       `Pic d'activité récurrent à ${heurePic[0]}h`,
          description: `Sur les 7 derniers jours, le pic d'activité se produit systématiquement à ${heurePic[0]}h (${heurePic[1]} jours sur ${heures.length}). Renforcez les effectifs à cette heure.`,
          actions:     [],
          meta: { heure: heurePic[0], occurrences: heurePic[1] },
        }));
      }
    }
  }

  return insights;
}

async function analyserCloturesMois(horizon) {
  if (horizon !== HORIZONS.MOIS) return [];
  const insights = [];

  const { jours, error } = await getJourneesDisponibles(debutMois(), hier());
  if (error || !jours) return insights;

  const nonClotures = jours.filter((j) => j.etat !== STATUTS_JOURNEE.CLOTURE);
  const tauxCloture = jours.length > 0 ? (jours.length - nonClotures.length) / jours.length : 1;

  if (tauxCloture < 0.80) {
    insights.push(createInsight({
      id:          "cloture_taux_mensuel_faible",
      source:      "ClotureAnalyzer",
      categorie:   CATEGORIES.CLOTURE,
      horizon,
      priorite:    PRIORITES.HAUTE,
      titre:       `Taux de clôture mensuel faible (${Math.round(tauxCloture * 100)} %)`,
      description: `Seulement ${jours.length - nonClotures.length} journée(s) sur ${jours.length} ont été clôturées ce mois. Les données de performance mensuelle sont incomplètes.`,
      actions:     [{ label: "Saisie rétroactive (Back-Day)", path: "/back-day" }],
      meta: { tauxCloture, nonClotures: nonClotures.length, total: jours.length },
    }));
  }

  return insights;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

const ClotureAnalyzer = {
  name: "ClotureAnalyzer",
  horizons: [HORIZONS.H24, HORIZONS.J7, HORIZONS.MOIS],

  async run(horizon) {
    const [hier_, semaine, mois] = await Promise.allSettled([
      analyserClotureHier(horizon),
      analyserClotures7j(horizon),
      analyserCloturesMois(horizon),
    ]);

    return [
      ...(hier_.status   === "fulfilled" ? hier_.value   : []),
      ...(semaine.status === "fulfilled" ? semaine.value : []),
      ...(mois.status    === "fulfilled" ? mois.value    : []),
    ];
  },
};

export default ClotureAnalyzer;
