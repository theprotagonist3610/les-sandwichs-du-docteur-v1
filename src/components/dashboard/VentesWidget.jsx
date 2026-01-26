import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  ShoppingBag,
  Truck,
  Store,
  Timer,
  Award,
  Package,
} from "lucide-react";
import NumberTicker from "@/components/animations/NumberTicker";
import {
  getCommandesDuJour,
  TYPES_COMMANDE,
  STATUTS_LIVRAISON,
  saveToCache,
} from "@/utils/commandeToolkit";
import { supabase } from "@/config/supabase";
import { useConfetti } from "@/hooks/useConfetti";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSoundSettings } from "@/store/soundSettingsStore";
import useAudioAutoplay from "@/hooks/useAudioAutoplay";
import useCommandeRefreshStore from "@/store/commandeRefreshStore";

const VentesWidget = ({ isMobile = false }) => {
  const [commandes, setCommandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hooks pour confetti et son
  const { successConfetti } = useConfetti();
  const { play } = useAudioPlayer();
  const { settings: soundSettings } = useSoundSettings();

  // 🔓 Déverrouiller l'autoplay audio au premier clic utilisateur
  useAudioAutoplay();

  // 🔄 Store pour rafraîchissement global
  const { triggerRefresh } = useCommandeRefreshStore();

  // Refs pour éviter les closures stale dans les callbacks Realtime
  const soundSettingsRef = useRef(soundSettings);
  const playRef = useRef(play);
  const successConfettiRef = useRef(successConfetti);
  const triggerRefreshRef = useRef(triggerRefresh);
  const loadDataRef = useRef(null);

  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    soundSettingsRef.current = soundSettings;
  }, [soundSettings]);

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    successConfettiRef.current = successConfetti;
  }, [successConfetti]);

  useEffect(() => {
    triggerRefreshRef.current = triggerRefresh;
  }, [triggerRefresh]);

  // Fonction pour charger les données - définie et stockée dans une ref
  const loadData = useCallback(async () => {
    console.log(
      "📊 [VentesWidget] loadData() appelé - Chargement des données...",
    );
    setIsLoading(true);

    const result = await getCommandesDuJour(true);
    console.log("📊 [VentesWidget] Résultat getCommandesDuJour:", {
      nombreCommandes: result.commandes?.length,
      fromCache: result.fromCache,
      error: result.error,
      premiereCommande: result.commandes?.[0]?.id,
    });

    if (result.commandes) {
      console.log(
        "📊 [VentesWidget] Mise à jour du state avec",
        result.commandes.length,
        "commandes",
      );
      setCommandes(result.commandes);
    } else {
      console.warn("📊 [VentesWidget] Pas de commandes reçues, state inchangé");
      setCommandes([]);
    }

    setIsLoading(false);
    console.log("📊 [VentesWidget] loadData() terminé");
  }, []);

  // 👀 TRACER LES CHANGEMENTS DU STATE COMMANDES
  useEffect(() => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║ 👀 [VentesWidget] STATE CHANGE: commandes                  ║
║   Nombre: ${commandes.length}                              
║   Commandes: ${commandes.length > 0 ? "✅ Chargées" : "❌ Vide"}                           
║   Timestamp: ${new Date().toISOString()}                   
╚════════════════════════════════════════════════════════════╝
    `);
  }, [commandes]);

  // Mettre à jour la ref loadData
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Fonction pour célébrer une nouvelle vente - utilise les refs
  const celebrateNewSale = useCallback(() => {
    console.log("🎉 [VentesWidget] Célébration nouvelle vente!");
    // Jouer le son de notification si activé
    if (soundSettingsRef.current.soundEnabled) {
      try {
        playRef.current(
          soundSettingsRef.current.notificationSound,
          soundSettingsRef.current.notificationVolume,
        );
      } catch (error) {
        console.warn("⚠️ [VentesWidget] Son bloqué :", error.message);
      }
    }
    // Lancer les confettis
    successConfettiRef.current();
  }, []);

  useEffect(() => {
    let channel = null;
    let cleanup = null;

    const setupRealtime = async () => {
      console.log("🔧 [VentesWidget] Initialisation du listener Realtime");

      // Vérifier l'authentification
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log(
        "👤 [VentesWidget] Utilisateur connecté :",
        user?.id || "NON CONNECTÉ",
      );

      if (!user) {
        console.error("❌ [VentesWidget] Pas d'utilisateur connecté !");
        return;
      }

      // Charger les données initiales
      loadData();

      // Souscrire aux changements en temps réel
      channel = supabase
        .channel("commandes-ventes-widget", {
          config: {
            broadcast: { ack: true },
            presence: { key: `ventes-widget-${user.id}` },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "commandes",
          },
          async (payload) => {
            const newCommandeId = payload.new?.id;
            console.log("✅ [VentesWidget] INSERT DÉTECTÉ !", {
              timestamp: new Date().toISOString(),
              payload,
              newRecord: payload.new,
            });

            // 💾 Sauvegarder la nouvelle commande dans le cache IndexedDB
            if (payload.new) {
              try {
                await saveToCache(payload.new);
                console.log(
                  "💾 [VentesWidget] Commande sauvegardée dans le cache",
                );
              } catch (err) {
                console.error("❌ Erreur cache :", err);
              }
            }

            // Nouvelle commande détectée - célébrer !
            celebrateNewSale();

            // Recharger les données du widget via la ref
            console.log("📊 [VentesWidget] Appel de loadDataRef.current()...");
            if (loadDataRef.current) {
              await loadDataRef.current();
            } else {
              console.error("❌ [VentesWidget] loadDataRef.current est null!");
            }

            // 🔄 Déclencher rafraîchissement global pour TOUTES les vues
            triggerRefreshRef.current(newCommandeId, "insert");
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "commandes",
          },
          async (payload) => {
            const updatedCommandeId = payload.new?.id;
            console.log("🔄 [VentesWidget] UPDATE DÉTECTÉ !", {
              timestamp: new Date().toISOString(),
              payload,
              oldRecord: payload.old,
              newRecord: payload.new,
            });

            // 💾 Mettre à jour la commande dans le cache IndexedDB
            if (payload.new) {
              try {
                await saveToCache(payload.new);
                console.log(
                  "💾 [VentesWidget] Commande mise à jour dans le cache",
                );
              } catch (err) {
                console.error("❌ Erreur cache :", err);
              }
            }

            // Mise à jour d'une commande - recharger données via la ref
            console.log(
              "📊 [VentesWidget] Appel de loadDataRef.current() pour UPDATE...",
            );
            if (loadDataRef.current) {
              await loadDataRef.current();
            } else {
              console.error("❌ [VentesWidget] loadDataRef.current est null!");
            }

            // 🔄 Déclencher rafraîchissement global pour TOUTES les vues
            triggerRefreshRef.current(updatedCommandeId, "update");
          },
        )
        .subscribe(
          (status) => {
            console.log("📡 [VentesWidget] Statut Realtime :", status);
            if (status === "SUBSCRIBED") {
              console.log("✨ [VentesWidget] Realtime ABONNÉ avec succès !");
            } else if (status === "CHANNEL_ERROR") {
              console.error(
                "❌ [VentesWidget] CHANNEL_ERROR - Problème de connexion",
              );
              console.error(
                "   Vérifiez : RLS policies, Realtime activé, authentification",
              );
            } else if (status === "CLOSED") {
              console.error("❌ [VentesWidget] Canal FERMÉ");
            } else if (status === "TIMED_OUT") {
              console.error(
                "⏱️ [VentesWidget] TIMED_OUT - Connexion trop lente",
              );
              console.error("   Tentative de reconnexion dans 3 secondes...");
              setTimeout(() => setupRealtime(), 3000);
            }
          },
          (error) => {
            console.error(
              "💥 [VentesWidget] Erreur Realtime détaillée :",
              error,
            );
          },
        );

      cleanup = () => {
        console.log(
          "🧹 [VentesWidget] Nettoyage - suppression du canal Realtime",
        );
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    };

    setupRealtime();

    // Cleanup au démontage
    return () => {
      if (cleanup) cleanup();
    };
    // Note: on utilise les refs dans les callbacks Realtime, donc pas besoin de loadData/celebrateNewSale dans les deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculs en temps réel basés sur les commandes du jour
  const stats = useMemo(() => {
    console.log(
      "🔄 [VentesWidget] useMemo recalculé avec commandes.length =",
      commandes.length,
    );

    if (!commandes || commandes.length === 0) {
      console.log("⚠️ [VentesWidget] useMemo: commandes vide");
      return {
        chiffreAffaires: 0,
        cadenceParHeure: 0,
        panierMoyen: 0,
        meilleurProduit: null,
        ventesSurPlace: { nombre: 0, ca: 0 },
        ventesLivraison: { nombre: 0, ca: 0 },
        livraisonsEnAttente: 0,
        totalLivraisons: 0,
        tempsMoyenLivraison: 0,
      };
    }

    // Chiffre d'affaires du jour (total après réduction)
    const chiffreAffaires = commandes.reduce((sum, cmd) => {
      return sum + (cmd.details_paiement?.total_apres_reduction || 0);
    }, 0);

    // Cadence de vente par heure
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const hoursElapsed = Math.max(1, (now - startOfDay) / (1000 * 60 * 60));
    const cadenceParHeure = commandes.length / hoursElapsed;

    // Panier moyen
    const commandesPayees = commandes.filter(
      (cmd) => cmd.details_paiement?.total_apres_reduction > 0,
    );
    const panierMoyen =
      commandesPayees.length > 0 ? chiffreAffaires / commandesPayees.length : 0;

    // Meilleur produit (celui qui génère le plus de CA)
    const produitsCA = {};
    commandes.forEach((cmd) => {
      (cmd.details_commandes || []).forEach((item) => {
        const nom = item.item;
        const total = item.quantite * item.prix_unitaire;
        if (produitsCA[nom]) {
          produitsCA[nom].ca += total;
          produitsCA[nom].quantite += item.quantite;
        } else {
          produitsCA[nom] = { nom, ca: total, quantite: item.quantite };
        }
      });
    });

    const meilleurProduit =
      Object.values(produitsCA).sort((a, b) => b.ca - a.ca)[0] || null;

    // Ventes sur place
    const commandesSurPlace = commandes.filter(
      (cmd) => cmd.type === TYPES_COMMANDE.SUR_PLACE,
    );
    const ventesSurPlace = {
      nombre: commandesSurPlace.length,
      ca: commandesSurPlace.reduce(
        (sum, cmd) => sum + (cmd.details_paiement?.total_apres_reduction || 0),
        0,
      ),
    };

    // Ventes à livrer
    const commandesLivraison = commandes.filter(
      (cmd) => cmd.type === TYPES_COMMANDE.LIVRAISON,
    );
    const ventesLivraison = {
      nombre: commandesLivraison.length,
      ca: commandesLivraison.reduce(
        (sum, cmd) => sum + (cmd.details_paiement?.total_apres_reduction || 0),
        0,
      ),
    };

    // Livraisons en attente / total livraisons
    const livraisonsEnAttente = commandesLivraison.filter(
      (cmd) =>
        cmd.statut_livraison === STATUTS_LIVRAISON.EN_ATTENTE ||
        cmd.statut_livraison === STATUTS_LIVRAISON.EN_COURS,
    ).length;
    const totalLivraisons = commandesLivraison.length;

    // Temps moyen de livraison (en minutes)
    const livraisonsTerminees = commandesLivraison.filter(
      (cmd) =>
        cmd.statut_livraison === STATUTS_LIVRAISON.LIVREE &&
        cmd.date_reelle_livraison &&
        cmd.heure_reelle_livraison &&
        cmd.created_at,
    );

    let tempsMoyenLivraison = 0;
    if (livraisonsTerminees.length > 0) {
      const totalMinutes = livraisonsTerminees.reduce((sum, cmd) => {
        const created = new Date(cmd.created_at);
        const delivered = new Date(
          `${cmd.date_reelle_livraison}T${cmd.heure_reelle_livraison}`,
        );
        const diffMinutes = (delivered - created) / (1000 * 60);
        return sum + Math.max(0, diffMinutes);
      }, 0);
      tempsMoyenLivraison = totalMinutes / livraisonsTerminees.length;
    }

    return {
      chiffreAffaires,
      cadenceParHeure,
      panierMoyen,
      meilleurProduit,
      ventesSurPlace,
      ventesLivraison,
      livraisonsEnAttente,
      totalLivraisons,
      tempsMoyenLivraison,
    };
  }, [commandes]);

  // Formater le montant en FCFA
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR").format(Math.round(montant));
  };

  return (
    <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
      <CardHeader className={isMobile ? "pb-2 px-4 pt-4" : "pb-3"}>
        <div className="flex items-center justify-between">
          <CardTitle
            className={`${
              isMobile ? "text-base" : "text-lg"
            } font-semibold text-foreground`}>
            Ventes du jour
          </CardTitle>
          <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
            <ShoppingCart
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-blue-600 dark:text-blue-400`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "px-4 pb-4 space-y-3" : "space-y-4"}>
        {/* Chiffre d'affaires principal */}
        <div className="bg-background/60 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } text-muted-foreground`}>
                Chiffre d'affaires
              </p>
              <div
                className={`${
                  isMobile ? "text-xl" : "text-2xl"
                } font-bold text-blue-600 dark:text-blue-400`}>
                <NumberTicker
                  value={stats.chiffreAffaires}
                  duration={1000}
                  formatter={(val) => `${formatMontant(val)} FCFA`}
                />
              </div>
            </div>
            <TrendingUp
              className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-blue-500/30`}
            />
          </div>
        </div>

        {/* Cadence et Panier moyen */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-orange-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Cadence/h
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-base" : "text-lg"
              } font-semibold text-foreground`}>
              <NumberTicker
                value={stats.cadenceParHeure}
                duration={1000}
                showDecimals={true}
                decimals={1}
              />
            </p>
          </div>
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingBag
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-purple-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Panier moyen
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-base" : "text-lg"
              } font-semibold text-foreground`}>
              <NumberTicker
                value={stats.panierMoyen}
                duration={1000}
                formatter={(val) => `${formatMontant(val)} F`}
              />
            </p>
          </div>
        </div>

        {/* Meilleur produit */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200 dark:border-amber-800 p-2">
          <div className="flex items-center gap-2">
            <Award
              className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-amber-500`}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Meilleur produit
              </p>
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-medium text-foreground truncate`}>
                {stats.meilleurProduit
                  ? stats.meilleurProduit.nom
                  : "Aucune vente"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-semibold text-amber-600 dark:text-amber-400`}>
                {stats.meilleurProduit ? (
                  <NumberTicker
                    value={stats.meilleurProduit.ca}
                    duration={1000}
                    formatter={(val) => `${formatMontant(val)} F`}
                  />
                ) : (
                  "-- F"
                )}
              </p>
              <p
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                {stats.meilleurProduit
                  ? `${stats.meilleurProduit.quantite} vendus`
                  : "0 vendu"}
              </p>
            </div>
          </div>
        </div>

        {/* Ventes sur place et à livrer */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Store
                className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} text-green-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Sur place
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-sm" : "text-base"
              } font-semibold text-foreground`}>
              <NumberTicker
                value={stats.ventesSurPlace.nombre}
                duration={1000}
              />{" "}
              ventes
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-green-600 dark:text-green-400`}>
              <NumberTicker
                value={stats.ventesSurPlace.ca}
                duration={1000}
                formatter={(val) => `${formatMontant(val)} F`}
              />
            </p>
          </div>
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck
                className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} text-cyan-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Livraison
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-sm" : "text-base"
              } font-semibold text-foreground`}>
              <NumberTicker
                value={stats.ventesLivraison.nombre}
                duration={1000}
              />{" "}
              ventes
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-cyan-600 dark:text-cyan-400`}>
              <NumberTicker
                value={stats.ventesLivraison.ca}
                duration={1000}
                formatter={(val) => `${formatMontant(val)} F`}
              />
            </p>
          </div>
        </div>

        {/* Livraisons en attente et temps moyen */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Package
                className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} text-rose-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Livraisons
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-sm" : "text-base"
              } font-semibold text-foreground`}>
              <span className="text-rose-600 dark:text-rose-400">
                <NumberTicker
                  value={stats.livraisonsEnAttente}
                  duration={1000}
                />
              </span>
              <span className="text-muted-foreground">
                /<NumberTicker value={stats.totalLivraisons} duration={1000} />
              </span>
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-muted-foreground`}>
              en attente
            </p>
          </div>
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Timer
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-indigo-500`}
              />
              <span
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                Temps moyen
              </span>
            </div>
            <p
              className={`${
                isMobile ? "text-sm" : "text-base"
              } font-semibold text-foreground`}>
              {stats.tempsMoyenLivraison > 0 ? (
                <>
                  <NumberTicker
                    value={stats.tempsMoyenLivraison}
                    duration={1000}
                  />{" "}
                  min
                </>
              ) : (
                "-- min"
              )}
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-muted-foreground`}>
              de livraison
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VentesWidget;
