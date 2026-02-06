// Edge Function: auto-closure
// Effectue la clôture automatique d'une journée et génère le rapport
// Appelée quand un changement de jour est détecté et la veille n'est pas clôturée
// Peut aussi être déclenchée par un cron job Supabase à minuit

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Constantes de prévisions (identiques à comptabiliteToolkit)
const REGLES_PREVISIONS = {
  CA_MINIMUM_JOUR: 15000,
  RATIO_DEPENSES_MAX: 0.40,
  POIDS_RECENT: 0.5,
  POIDS_MOYEN: 0.3,
  POIDS_ANCIEN: 0.2,
};

interface CommandeDetail {
  menu_id: string;
  item?: string;
  quantite: number;
}

interface Commande {
  id: string;
  created_at: string;
  updated_at?: string;
  type: string;
  statut_commande?: string;
  statut_livraison?: string;
  client?: string;
  vendeur?: string;
  point_de_vente?: string;
  details_commandes: CommandeDetail[];
  details_paiement: {
    momo?: number;
    cash?: number;
    autre?: number;
  };
  promotion?: {
    type?: string;
    valeur?: number;
  };
  heure_livraison?: string;
  heure_reelle_livraison?: string;
  vendeur_info?: { id: string; nom: string; prenoms: string };
  point_de_vente_info?: { id: string; nom: string };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { date, triggered_by } = await req.json();

    if (!date) {
      return new Response(
        JSON.stringify({ success: false, error: "Date requise" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔄 Clôture automatique demandée pour ${date}`);

    // 1. Vérifier si une clôture existe déjà
    const { data: existingClosure } = await supabase
      .from("days")
      .select("id")
      .eq("jour", date)
      .maybeSingle();

    if (existingClosure) {
      console.log(`⚠️ Clôture déjà existante pour ${date}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Clôture déjà effectuée",
          closure: existingClosure,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Récupérer les commandes du jour
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data: commandes, error: commandesError } = await supabase
      .from("commandes")
      .select(
        `
        *,
        vendeur_info:users!vendeur(id, nom, prenoms),
        point_de_vente_info:emplacements!point_de_vente(id, nom)
      `
      )
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: true });

    if (commandesError) {
      console.error("Erreur récupération commandes:", commandesError);
      return new Response(
        JSON.stringify({
          success: false,
          error: commandesError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!commandes || commandes.length === 0) {
      console.log(`📭 Aucune commande pour ${date}, pas de clôture nécessaire`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucune commande, pas de clôture nécessaire",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 ${commandes.length} commandes trouvées pour ${date}`);

    // 3. Calculer les métriques
    const metrics = calculateDayMetrics(commandes as Commande[], date);

    // 4. Récupérer les infos des menus pour le meilleur produit
    const menuIds = new Set<string>();
    commandes.forEach((c: Commande) => {
      c.details_commandes?.forEach((d) => {
        if (d.menu_id) menuIds.add(d.menu_id);
      });
    });

    let meilleurProduit = { id: null as string | null, nom: null as string | null, quantite: 0 };
    if (menuIds.size > 0) {
      const { data: menus } = await supabase
        .from("menus")
        .select("id, nom")
        .in("id", Array.from(menuIds));

      const menusMap = new Map<string, { id: string; nom: string }>(
        menus?.map((m: { id: string; nom: string }) => [m.id, m]) || []
      );
      meilleurProduit = findBestProduct(commandes as Commande[], menusMap);
    }

    // 5. Construire l'objet de clôture
    const closureData = {
      ...metrics,
      meilleur_produit_id: meilleurProduit.id,
      meilleur_produit_nom: meilleurProduit.nom,
      meilleur_produit_quantite: meilleurProduit.quantite,
      cloture_par: triggered_by || null,
      cloture_a: new Date().toISOString(),
      notes: "Clôture automatique (changement de jour détecté)",
    };

    // 6. Enregistrer la clôture
    const { data: closure, error: insertError } = await supabase
      .from("days")
      .insert(closureData)
      .select()
      .single();

    if (insertError) {
      console.error("Erreur insertion clôture:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError.message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Clôture automatique réussie pour ${date}`);

    // 7. Générer automatiquement le rapport journalier
    const rapportResult = await genererRapportJournalier(
      supabase,
      date,
      closureData,
      triggered_by
    );

    if (rapportResult.success) {
      console.log(`📊 Rapport généré: ${rapportResult.rapport?.denomination}`);
    } else {
      console.warn(`⚠️ Erreur génération rapport: ${rapportResult.error}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        closure,
        rapport: rapportResult.success ? rapportResult.rapport : null,
        rapport_error: rapportResult.success ? null : rapportResult.error,
        message: `Clôture automatique effectuée pour ${date}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur auto-closure:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// =====================================================
// FONCTIONS DE CALCUL (adaptées de dayClosureToolkit)
// =====================================================

function calculateDayMetrics(commandes: Commande[], date: string) {
  const nombreVentesTotal = commandes.length;

  // Temporalité
  const timestamps = commandes.map((c) => new Date(c.created_at).getTime());
  const ouverture = new Date(Math.min(...timestamps));
  const fermeture = new Date(Math.max(...timestamps));
  const dureeOuvertureMinutes = Math.round(
    (fermeture.getTime() - ouverture.getTime()) / (1000 * 60)
  );

  // Métriques par type
  const nombreVentesSurPlace = commandes.filter(
    (c) => c.type === "sur-place"
  ).length;
  const nombreVentesLivraison = commandes.filter(
    (c) => c.type === "livraison"
  ).length;
  const nombreVentesEmporter = commandes.filter(
    (c) => c.type === "emporter" || c.type === "à emporter"
  ).length;

  // Paiements
  const paiementStats = calculatePaiementMetrics(commandes);

  // Chiffre d'affaires
  const chiffreAffaires = commandes.reduce((sum, c) => {
    const p = c.details_paiement || {};
    return sum + (p.momo || 0) + (p.cash || 0) + (p.autre || 0);
  }, 0);

  const panierMoyen =
    nombreVentesTotal > 0 ? chiffreAffaires / nombreVentesTotal : 0;

  // Cadence
  const startOfDay = new Date(ouverture);
  startOfDay.setHours(6, 0, 0, 0);
  const hoursElapsed = Math.max(
    1,
    (fermeture.getTime() - startOfDay.getTime()) / (1000 * 60 * 60)
  );
  const cadenceVente = nombreVentesTotal / hoursElapsed;

  const tauxLivraison =
    nombreVentesTotal > 0 ? (nombreVentesLivraison / nombreVentesTotal) * 100 : 0;

  // Produits distincts
  const uniqueProducts = new Set<string>();
  commandes.forEach((c) => {
    c.details_commandes?.forEach((d) => {
      if (d.menu_id) uniqueProducts.add(d.menu_id);
    });
  });

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

  // Statuts
  const statutsStats = calculateStatutsMetrics(commandes);

  return {
    jour: date,
    ouverture: formatTime(ouverture),
    fermeture: formatTime(fermeture),
    duree_ouverture_minutes: dureeOuvertureMinutes,
    nombre_ventes_total: nombreVentesTotal,
    nombre_ventes_sur_place: nombreVentesSurPlace,
    nombre_ventes_livraison: nombreVentesLivraison,
    nombre_ventes_emporter: nombreVentesEmporter,
    ...paiementStats,
    chiffre_affaires: Math.round(chiffreAffaires * 100) / 100,
    panier_moyen: Math.round(panierMoyen * 100) / 100,
    ticket_moyen: Math.round(panierMoyen * 100) / 100,
    cadence_vente: Math.round(cadenceVente * 100) / 100,
    taux_livraison: Math.round(tauxLivraison * 100) / 100,
    nombre_produits_distincts: uniqueProducts.size,
    ...promotionStats,
    ...pointsVenteStats,
    ...vendeursStats,
    ...clientsStats,
    ...heurePointeStats,
    ...statutsStats,
    temps_moyen_preparation_minutes: 0,
    temps_moyen_livraison_minutes: 0,
  };
}

function calculatePaiementMetrics(commandes: Commande[]) {
  let nombrePaiementsMomo = 0;
  let nombrePaiementsCash = 0;
  let nombrePaiementsAutre = 0;
  let nombrePaiementsMixtes = 0;
  let montantPercuMomo = 0;
  let montantPercuCash = 0;
  let montantPercuAutre = 0;

  commandes.forEach((c) => {
    const p = c.details_paiement || {};
    const modesActifs = Object.keys(p).filter(
      (mode) => p[mode as keyof typeof p]! > 0
    );

    if (modesActifs.length > 1) nombrePaiementsMixtes++;

    if (p.momo && p.momo > 0) {
      nombrePaiementsMomo++;
      montantPercuMomo += p.momo;
    }
    if (p.cash && p.cash > 0) {
      nombrePaiementsCash++;
      montantPercuCash += p.cash;
    }
    if (p.autre && p.autre > 0) {
      nombrePaiementsAutre++;
      montantPercuAutre += p.autre;
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
}

function findBestProduct(
  commandes: Commande[],
  menusMap: Map<string, { id: string; nom: string }>
) {
  const productCounts: Record<string, { id: string; nom: string; quantite: number }> = {};

  commandes.forEach((c) => {
    c.details_commandes?.forEach((d) => {
      if (!d.menu_id) return;
      if (!productCounts[d.menu_id]) {
        const menuInfo = menusMap.get(d.menu_id);
        productCounts[d.menu_id] = {
          id: d.menu_id,
          nom: menuInfo?.nom || d.item || "Produit inconnu",
          quantite: 0,
        };
      }
      productCounts[d.menu_id].quantite += d.quantite || 1;
    });
  });

  const products = Object.values(productCounts);
  if (products.length === 0) return { id: null, nom: null, quantite: 0 };

  return products.reduce((best, current) =>
    current.quantite > best.quantite ? current : best
  );
}

function calculatePromotionMetrics(commandes: Commande[]) {
  let commandesAvecPromo = 0;
  let montantTotalRemises = 0;

  commandes.forEach((c) => {
    if (c.promotion && typeof c.promotion === "object") {
      commandesAvecPromo++;
      const p = c.details_paiement || {};
      const total = (p.momo || 0) + (p.cash || 0) + (p.autre || 0);

      if (c.promotion.type === "pourcentage" && c.promotion.valeur) {
        montantTotalRemises += (total * c.promotion.valeur) / 100;
      } else if (c.promotion.type === "fixe" && c.promotion.valeur) {
        montantTotalRemises += c.promotion.valeur;
      }
    }
  });

  return {
    nombre_promotions_utilisees: commandesAvecPromo,
    montant_total_remises: Math.round(montantTotalRemises * 100) / 100,
  };
}

function calculatePointsVenteMetrics(commandes: Commande[]) {
  const stats: Record<string, { id: string; nom: string; ca: number; ventes: number }> = {};

  commandes.forEach((c) => {
    const pdvId = c.point_de_vente;
    if (!pdvId) return;

    if (!stats[pdvId]) {
      stats[pdvId] = {
        id: pdvId,
        nom: c.point_de_vente_info?.nom || "PDV inconnu",
        ca: 0,
        ventes: 0,
      };
    }

    const p = c.details_paiement || {};
    stats[pdvId].ca += (p.momo || 0) + (p.cash || 0) + (p.autre || 0);
    stats[pdvId].ventes++;
  });

  const arr = Object.values(stats);
  const best = arr.length > 0 ? arr.reduce((b, c) => (c.ca > b.ca ? c : b)) : null;

  return {
    nombre_points_vente_actifs: arr.length,
    meilleur_point_vente_id: best?.id || null,
    meilleur_point_vente_nom: best?.nom || null,
    meilleur_point_vente_ca: best ? Math.round(best.ca * 100) / 100 : 0,
  };
}

function calculateVendeursMetrics(commandes: Commande[]) {
  const stats: Record<string, { id: string; nom: string; ventes: number }> = {};

  commandes.forEach((c) => {
    const vendeurId = c.vendeur;
    if (!vendeurId) return;

    if (!stats[vendeurId]) {
      const info = c.vendeur_info;
      stats[vendeurId] = {
        id: vendeurId,
        nom: info ? `${info.prenoms || ""} ${info.nom || ""}`.trim() : "Vendeur inconnu",
        ventes: 0,
      };
    }
    stats[vendeurId].ventes++;
  });

  const arr = Object.values(stats);
  const best = arr.length > 0 ? arr.reduce((b, c) => (c.ventes > b.ventes ? c : b)) : null;

  return {
    nombre_vendeurs_actifs: arr.length,
    meilleur_vendeur_id: best?.id || null,
    meilleur_vendeur_nom: best?.nom || null,
    meilleur_vendeur_ventes: best?.ventes || 0,
  };
}

function calculateClientsMetrics(commandes: Commande[]) {
  const clientCounts: Record<string, number> = {};

  commandes.forEach((c) => {
    const clientId = c.client || "anonyme";
    clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
  });

  const clientsUniques = Object.keys(clientCounts).length;
  const clientsReguliers = Object.values(clientCounts).filter((c) => c > 1).length;
  const tauxClientsReguliers =
    clientsUniques > 0 ? (clientsReguliers / clientsUniques) * 100 : 0;

  return {
    nombre_clients_uniques: clientsUniques,
    taux_clients_reguliers: Math.round(tauxClientsReguliers * 100) / 100,
  };
}

function calculatePeakHours(commandes: Commande[]) {
  const hourCounts: Record<number, number> = {};

  commandes.forEach((c) => {
    const hour = new Date(c.created_at).getHours();
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
    (max, [hour, count]) =>
      count > max.count ? { hour: parseInt(hour), count } : max,
    { hour: 0, count: 0 }
  );

  return {
    heure_pointe_debut: `${peakHour.hour.toString().padStart(2, "0")}:00:00`,
    heure_pointe_fin: `${peakHour.hour.toString().padStart(2, "0")}:59:59`,
    ventes_heure_pointe: peakHour.count,
  };
}

function calculateStatutsMetrics(commandes: Commande[]) {
  const statuts = { annulees: 0, en_cours: 0, livrees: 0, terminees: 0 };

  commandes.forEach((c) => {
    const statutCommande = c.statut_commande?.toLowerCase();
    const statutLivraison = c.statut_livraison?.toLowerCase();

    if (statutCommande === "annulee") statuts.annulees++;
    else if (statutCommande === "en_cours") statuts.en_cours++;
    else if (statutCommande === "terminee") statuts.terminees++;

    if (statutLivraison === "livree") statuts.livrees++;
  });

  const commandesCompletees = statuts.terminees + statuts.livrees;
  const tauxCompletion =
    commandes.length > 0 ? (commandesCompletees / commandes.length) * 100 : 0;

  return {
    nombre_commandes_annulees: statuts.annulees,
    nombre_commandes_en_preparation: statuts.en_cours,
    nombre_commandes_livrees: statuts.livrees,
    nombre_commandes_retirees: statuts.terminees - statuts.livrees,
    taux_completion: Math.round(tauxCompletion * 100) / 100,
  };
}

function formatTime(date: Date): string {
  return date.toTimeString().split(" ")[0];
}

// =====================================================
// GÉNÉRATION DU RAPPORT JOURNALIER
// =====================================================

/**
 * Génère la dénomination du rapport au format rapport_DDMMYYYY
 */
function genererDenomination(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `rapport_${day}${month}${year}`;
}

/**
 * Calcule l'écart en pourcentage entre réalisé et objectif
 */
function calculerEcartPourcentage(realise: number, objectif: number): number {
  if (!objectif || objectif === 0) return 0;
  return Math.round(((realise - objectif) / objectif) * 100);
}

/**
 * Récupère les dépenses d'une journée
 */
async function getDepensesJour(
  supabase: ReturnType<typeof createClient>,
  date: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("operations_comptables")
      .select("montant")
      .eq("operation", "depense")
      .eq("date_operation", date);

    if (error) {
      console.error("Erreur récupération dépenses:", error);
      return 0;
    }

    return (data || []).reduce(
      (sum: number, op: { montant: number }) => sum + parseFloat(String(op.montant)),
      0
    );
  } catch (error) {
    console.error("Erreur getDepensesJour:", error);
    return 0;
  }
}

/**
 * Calcule le CA prévu journalier basé sur l'historique des encaissements
 */
async function calculerCAPrevuJournalier(
  supabase: ReturnType<typeof createClient>,
  date: string
): Promise<number> {
  try {
    const dateRef = new Date(date);

    // Dates pour les différentes périodes
    const date30j = new Date(dateRef);
    date30j.setDate(date30j.getDate() - 30);

    // Récupérer les encaissements des 30 derniers jours
    const { data, error } = await supabase
      .from("operations_comptables")
      .select("montant, date_operation")
      .eq("operation", "encaissement")
      .gte("date_operation", date30j.toISOString().split("T")[0])
      .lte("date_operation", date);

    if (error || !data || data.length === 0) {
      return REGLES_PREVISIONS.CA_MINIMUM_JOUR;
    }

    // Organiser les encaissements par jour
    const encaissementsParJour: Record<string, number> = {};
    data.forEach((op: { montant: number; date_operation: string }) => {
      const dateOp = op.date_operation.split("T")[0];
      if (!encaissementsParJour[dateOp]) {
        encaissementsParJour[dateOp] = 0;
      }
      encaissementsParJour[dateOp] += parseFloat(String(op.montant));
    });

    // Calculer les moyennes par période
    const calculerMoyenne = (dateDebut: Date, dateFin: Date): number => {
      let total = 0;
      let jours = 0;

      const current = new Date(dateDebut);
      while (current <= dateFin) {
        const dateStr = current.toISOString().split("T")[0];
        if (encaissementsParJour[dateStr] !== undefined) {
          total += encaissementsParJour[dateStr];
          jours++;
        }
        current.setDate(current.getDate() + 1);
      }

      return jours > 0 ? total / jours : 0;
    };

    const date7j = new Date(dateRef);
    date7j.setDate(date7j.getDate() - 7);
    const date15j = new Date(dateRef);
    date15j.setDate(date15j.getDate() - 15);

    const moyenne7j = calculerMoyenne(date7j, dateRef);
    const moyenne15j = calculerMoyenne(date15j, dateRef);
    const moyenne30j = calculerMoyenne(date30j, dateRef);

    // Calcul pondéré
    let caPondere = 0;
    let poidsTotal = 0;

    if (moyenne7j > 0) {
      caPondere += moyenne7j * REGLES_PREVISIONS.POIDS_RECENT;
      poidsTotal += REGLES_PREVISIONS.POIDS_RECENT;
    }
    if (moyenne15j > 0) {
      caPondere += moyenne15j * REGLES_PREVISIONS.POIDS_MOYEN;
      poidsTotal += REGLES_PREVISIONS.POIDS_MOYEN;
    }
    if (moyenne30j > 0) {
      caPondere += moyenne30j * REGLES_PREVISIONS.POIDS_ANCIEN;
      poidsTotal += REGLES_PREVISIONS.POIDS_ANCIEN;
    }

    const caCalcule = poidsTotal > 0 ? caPondere / poidsTotal : 0;

    // Appliquer le minimum
    return Math.max(Math.round(caCalcule), REGLES_PREVISIONS.CA_MINIMUM_JOUR);
  } catch (error) {
    console.error("Erreur calculerCAPrevuJournalier:", error);
    return REGLES_PREVISIONS.CA_MINIMUM_JOUR;
  }
}

/**
 * Récupère les prévisions de ventes depuis l'historique des clôtures
 */
async function getPrevisionsVentes(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  try {
    // Récupérer les 30 dernières clôtures
    const { data, error } = await supabase
      .from("days")
      .select("nombre_ventes_total")
      .order("jour", { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      return 0;
    }

    // Calculer la moyenne pondérée
    const last7 = data.slice(0, 7);
    const last15 = data.slice(0, 15);
    const last30 = data;

    const avg = (arr: { nombre_ventes_total: number }[]) =>
      arr.length > 0
        ? arr.reduce((sum, d) => sum + (d.nombre_ventes_total || 0), 0) / arr.length
        : 0;

    const avg7 = avg(last7);
    const avg15 = avg(last15);
    const avg30 = avg(last30);

    let weighted = 0;
    let totalWeight = 0;

    if (avg7 > 0) {
      weighted += avg7 * REGLES_PREVISIONS.POIDS_RECENT;
      totalWeight += REGLES_PREVISIONS.POIDS_RECENT;
    }
    if (avg15 > 0) {
      weighted += avg15 * REGLES_PREVISIONS.POIDS_MOYEN;
      totalWeight += REGLES_PREVISIONS.POIDS_MOYEN;
    }
    if (avg30 > 0) {
      weighted += avg30 * REGLES_PREVISIONS.POIDS_ANCIEN;
      totalWeight += REGLES_PREVISIONS.POIDS_ANCIEN;
    }

    return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
  } catch (error) {
    console.error("Erreur getPrevisionsVentes:", error);
    return 0;
  }
}

/**
 * Génère automatiquement le rapport journalier
 */
async function genererRapportJournalier(
  supabase: ReturnType<typeof createClient>,
  date: string,
  metrics: Record<string, unknown>,
  userId: string | null
): Promise<{ success: boolean; rapport?: Record<string, unknown>; error?: string }> {
  try {
    const denomination = genererDenomination(date);

    // 1. Vérifier si un rapport existe déjà
    const { data: existingRapport } = await supabase
      .from("rapports")
      .select("id")
      .eq("denomination", denomination)
      .maybeSingle();

    // 2. Récupérer les dépenses du jour
    const depensesJour = await getDepensesJour(supabase, date);

    // 3. Calculer les objectifs
    const objectifVentes = await getPrevisionsVentes(supabase);
    const objectifEncaissement = await calculerCAPrevuJournalier(supabase, date);

    // Objectif dépenses = 40% du CA prévu
    const objectifDepense = Math.round(
      objectifEncaissement * REGLES_PREVISIONS.RATIO_DEPENSES_MAX
    );

    // 4. Calculer les écarts
    const totalVentes = (metrics.nombre_ventes_total as number) || 0;
    const totalEncaissement = (metrics.chiffre_affaires as number) || 0;

    const ecartVentes = calculerEcartPourcentage(totalVentes, objectifVentes);
    const ecartEncaissement = calculerEcartPourcentage(totalEncaissement, objectifEncaissement);
    const ecartDepense = calculerEcartPourcentage(depensesJour, objectifDepense);

    // 5. Créer ou mettre à jour le rapport
    const rapportData = {
      denomination,
      total_ventes: totalVentes,
      total_encaissement: totalEncaissement,
      total_depense: depensesJour,
      objectifs: {
        ventes: ecartVentes,
        encaissement: ecartEncaissement,
        depense: ecartDepense,
      },
      created_by: userId,
    };

    if (existingRapport) {
      // Mise à jour
      const { data, error } = await supabase
        .from("rapports")
        .update({
          total_ventes: totalVentes,
          total_encaissement: totalEncaissement,
          total_depense: depensesJour,
          objectifs: {
            ventes: ecartVentes,
            encaissement: ecartEncaissement,
            depense: ecartDepense,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRapport.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, rapport: data };
    } else {
      // Création
      const { data, error } = await supabase
        .from("rapports")
        .insert(rapportData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, rapport: data };
    }
  } catch (error) {
    console.error("Erreur genererRapportJournalier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
