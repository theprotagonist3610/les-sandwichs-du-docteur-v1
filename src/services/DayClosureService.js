/**
 * DayClosureService.js
 * Service de gestion des clôtures journalières
 * Architecture MVC - Couche Controller/Business Logic
 */

import {
  getCommandesByDate,
  getDayClosureByDate,
  getAllDayClosures,
  calculateDayMetrics,
  saveDayClosure,
  deleteDayClosure,
  generateDayForecast,
  calculateRealtimeMetrics,
  compareMetrics,
} from "@/utils/dayClosureToolkit";

/**
 * Service principal de clôture journalière
 */
class DayClosureService {
  /**
   * Effectue la clôture complète d'une journée
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} userId - ID de l'utilisateur qui effectue la clôture
   * @param {string} notes - Notes optionnelles
   * @returns {Promise<{success: boolean, closure: Object, error: string}>}
   */
  async performDayClosure(date, userId, notes = "") {
    try {
      // Validation
      if (!date || !userId) {
        return {
          success: false,
          closure: null,
          error: "Date et ID utilisateur requis",
        };
      }

      // Vérifier si une clôture existe déjà
      const existingClosure = await getDayClosureByDate(date);

      // 1. Récupérer les commandes du jour
      const commandes = await getCommandesByDate(date);

      if (commandes.length === 0) {
        return {
          success: false,
          closure: null,
          error: "Aucune commande trouvée pour cette journée",
        };
      }

      // 2. Calculer les métriques
      const metrics = await calculateDayMetrics(commandes);

      // 3. Enregistrer la clôture
      const closure = await saveDayClosure(metrics, userId, notes);

      return {
        success: true,
        closure,
        error: null,
        isUpdate: !!existingClosure,
      };
    } catch (error) {
      console.error("Erreur performDayClosure:", error);
      return {
        success: false,
        closure: null,
        error: error.message || "Erreur lors de la clôture",
      };
    }
  }

  /**
   * Récupère la clôture d'une journée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<{success: boolean, closure: Object, error: string}>}
   */
  async getClosure(date) {
    try {
      const closure = await getDayClosureByDate(date);

      return {
        success: true,
        closure,
        error: null,
      };
    } catch (error) {
      console.error("Erreur getClosure:", error);
      return {
        success: false,
        closure: null,
        error: error.message || "Erreur lors de la récupération",
      };
    }
  }

  /**
   * Récupère toutes les clôtures avec pagination
   * @param {number} limit - Nombre de résultats
   * @param {number} offset - Décalage
   * @returns {Promise<{success: boolean, closures: Array, error: string}>}
   */
  async getAllClosures(limit = 30, offset = 0) {
    try {
      const closures = await getAllDayClosures(limit, offset);

      return {
        success: true,
        closures,
        error: null,
      };
    } catch (error) {
      console.error("Erreur getAllClosures:", error);
      return {
        success: false,
        closures: [],
        error: error.message || "Erreur lors de la récupération",
      };
    }
  }

  /**
   * Prévisualise les métriques d'une journée sans enregistrer
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<{success: boolean, metrics: Object, commandesCount: number, error: string}>}
   */
  async previewMetrics(date) {
    try {
      // Récupérer les commandes du jour
      const commandes = await getCommandesByDate(date);

      if (commandes.length === 0) {
        return {
          success: false,
          metrics: null,
          commandesCount: 0,
          error: "Aucune commande trouvée pour cette journée",
        };
      }

      // Calculer les métriques
      const metrics = await calculateDayMetrics(commandes);

      return {
        success: true,
        metrics,
        commandesCount: commandes.length,
        error: null,
      };
    } catch (error) {
      console.error("Erreur previewMetrics:", error);
      return {
        success: false,
        metrics: null,
        commandesCount: 0,
        error: error.message || "Erreur lors du calcul des métriques",
      };
    }
  }

  /**
   * Supprime une clôture journalière
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} userRole - Rôle de l'utilisateur (seuls les admins peuvent supprimer)
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async deleteClosure(date, userRole) {
    try {
      // Vérification des permissions
      if (userRole !== "admin") {
        return {
          success: false,
          error: "Seuls les administrateurs peuvent supprimer des clôtures",
        };
      }

      await deleteDayClosure(date);

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      console.error("Erreur deleteClosure:", error);
      return {
        success: false,
        error: error.message || "Erreur lors de la suppression",
      };
    }
  }

  /**
   * Vérifie si une clôture peut être effectuée pour une date donnée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<{canClose: boolean, reason: string, commandesCount: number}>}
   */
  async canClosureBePerformed(date) {
    try {
      // Vérifier qu'on ne clôture pas le futur
      // Utiliser les dates au format YYYY-MM-DD pour éviter les problèmes de timezone
      const targetDateStr = date; // YYYY-MM-DD
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      if (targetDateStr > todayStr) {
        return {
          canClose: false,
          reason: "Impossible de clôturer une journée future",
          commandesCount: 0,
        };
      }

      // Vérifier qu'il y a des commandes
      const commandes = await getCommandesByDate(date);

      if (commandes.length === 0) {
        return {
          canClose: false,
          reason: "Aucune commande pour cette journée",
          commandesCount: 0,
        };
      }

      // La clôture est possible dès qu'il y a des commandes
      // Les commandes "en_cours" sont autorisées (commandes en avance pour livraison future)
      return {
        canClose: true,
        reason: "Clôture possible",
        commandesCount: commandes.length,
      };
    } catch (error) {
      console.error("Erreur canClosureBePerformed:", error);
      return {
        canClose: false,
        reason: error.message || "Erreur lors de la vérification",
        commandesCount: 0,
      };
    }
  }

  /**
   * Génère un rapport de comparaison entre plusieurs jours
   * @param {Array<string>} dates - Tableau de dates au format YYYY-MM-DD
   * @returns {Promise<{success: boolean, comparison: Array, error: string}>}
   */
  async compareClosures(dates) {
    try {
      const comparisons = [];

      for (const date of dates) {
        const closure = await getDayClosureByDate(date);
        if (closure) {
          comparisons.push({
            date,
            ...closure,
          });
        }
      }

      return {
        success: true,
        comparison: comparisons,
        error: null,
      };
    } catch (error) {
      console.error("Erreur compareClosures:", error);
      return {
        success: false,
        comparison: [],
        error: error.message || "Erreur lors de la comparaison",
      };
    }
  }

  /**
   * Calcule les statistiques sur une période
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, stats: Object, error: string}>}
   */
  async getPeriodStats(startDate, endDate) {
    try {
      // Récupérer toutes les clôtures de la période
      const closures = await getAllDayClosures(365, 0); // Max 1 an

      // Filtrer par période
      const periodClosures = closures.filter((c) => {
        const closureDate = new Date(c.jour);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return closureDate >= start && closureDate <= end;
      });

      if (periodClosures.length === 0) {
        return {
          success: false,
          stats: null,
          error: "Aucune clôture trouvée pour cette période",
        };
      }

      // Calculer les stats agrégées
      const stats = {
        periode: {
          debut: startDate,
          fin: endDate,
          jours_total: periodClosures.length,
        },
        ventes: {
          total: periodClosures.reduce((sum, c) => sum + c.nombre_ventes_total, 0),
          moyenne_par_jour:
            periodClosures.reduce((sum, c) => sum + c.nombre_ventes_total, 0) /
            periodClosures.length,
          meilleur_jour: periodClosures.reduce((best, c) =>
            c.nombre_ventes_total > best.nombre_ventes_total ? c : best
          ),
        },
        chiffre_affaires: {
          total: periodClosures.reduce((sum, c) => sum + c.chiffre_affaires, 0),
          moyenne_par_jour:
            periodClosures.reduce((sum, c) => sum + c.chiffre_affaires, 0) /
            periodClosures.length,
          meilleur_jour: periodClosures.reduce((best, c) =>
            c.chiffre_affaires > best.chiffre_affaires ? c : best
          ),
        },
        panier_moyen: {
          global:
            periodClosures.reduce((sum, c) => sum + c.panier_moyen, 0) /
            periodClosures.length,
          min: Math.min(...periodClosures.map((c) => c.panier_moyen)),
          max: Math.max(...periodClosures.map((c) => c.panier_moyen)),
        },
        paiements: {
          total_momo: periodClosures.reduce((sum, c) => sum + c.montant_percu_momo, 0),
          total_cash: periodClosures.reduce((sum, c) => sum + c.montant_percu_cash, 0),
          total_autre: periodClosures.reduce((sum, c) => sum + c.montant_percu_autre, 0),
        },
      };

      return {
        success: true,
        stats,
        error: null,
      };
    } catch (error) {
      console.error("Erreur getPeriodStats:", error);
      return {
        success: false,
        stats: null,
        error: error.message || "Erreur lors du calcul des statistiques",
      };
    }
  }

  /**
   * Génère les prévisions pour la journée en cours
   * @returns {Promise<{success: boolean, forecast: Object, error: string}>}
   */
  async generateForecast() {
    try {
      const forecast = await generateDayForecast();

      return {
        success: true,
        forecast,
        error: null,
      };
    } catch (error) {
      console.error("Erreur generateForecast:", error);
      return {
        success: false,
        forecast: null,
        error: error.message || "Erreur lors de la génération des prévisions",
      };
    }
  }

  /**
   * Récupère les métriques en temps réel et les compare aux prévisions
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<{success: boolean, realtime: Object, forecast: Object, comparison: Object, error: string}>}
   */
  async getRealtimeVsForecast(date) {
    try {
      // 1. Récupérer la clôture (qui contient les prévisions)
      const closure = await getDayClosureByDate(date);

      // 2. Calculer les métriques en temps réel
      const realtime = await calculateRealtimeMetrics(date);

      // 3. Si pas de prévisions dans la clôture, les générer
      let forecast = closure?.previsions || null;
      if (!forecast) {
        const forecastData = await generateDayForecast();
        forecast = forecastData.previsions;
      }

      // 4. Comparer les métriques
      const comparison = compareMetrics(realtime, forecast);

      return {
        success: true,
        realtime,
        forecast,
        comparison,
        error: null,
      };
    } catch (error) {
      console.error("Erreur getRealtimeVsForecast:", error);
      return {
        success: false,
        realtime: null,
        forecast: null,
        comparison: null,
        error: error.message || "Erreur lors de la comparaison",
      };
    }
  }

  /**
   * Récupère uniquement les métriques en temps réel pour une date
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<{success: boolean, metrics: Object, error: string}>}
   */
  async getRealtimeMetrics(date) {
    try {
      const metrics = await calculateRealtimeMetrics(date);

      return {
        success: true,
        metrics,
        error: null,
      };
    } catch (error) {
      console.error("Erreur getRealtimeMetrics:", error);
      return {
        success: false,
        metrics: null,
        error: error.message || "Erreur lors du calcul des métriques",
      };
    }
  }
}

// Export d'une instance unique (Singleton)
const dayClosureService = new DayClosureService();
export default dayClosureService;
