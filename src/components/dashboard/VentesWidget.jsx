import { useState, useEffect, useMemo } from "react";
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
import {
  getCommandesDuJour,
  TYPES_COMMANDE,
  STATUTS_LIVRAISON,
} from "@/utils/commandeToolkit";
import { supabase } from "@/config/supabase";
import { useConfetti } from "@/hooks/useConfetti";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useSoundSettings } from "@/store/soundSettingsStore";

const VentesWidget = ({ isMobile = false }) => {
  const [commandes, setCommandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hooks pour confetti et son
  const { successConfetti } = useConfetti();
  const { play } = useAudioPlayer();
  const { settings: soundSettings } = useSoundSettings();

  // Fonction pour célébrer une nouvelle vente
  const celebrateNewSale = () => {
    // Jouer le son de notification si activé
    if (soundSettings.soundEnabled) {
      play(soundSettings.notificationSound, soundSettings.notificationVolume);
    }
    // Lancer les confettis
    successConfetti();
  };

  useEffect(() => {
    loadData();

    // Souscrire aux changements en temps réel
    const channel = supabase
      .channel("commandes-ventes-widget")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "commandes",
        },
        () => {
          // Nouvelle commande détectée - célébrer !
          celebrateNewSale();
          // Recharger les données
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "commandes",
        },
        () => {
          // Mise à jour d'une commande - juste recharger
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundSettings]);

  const loadData = async () => {
    setIsLoading(true);
    const { commandes: commandesData } = await getCommandesDuJour(true);
    setCommandes(commandesData || []);
    setIsLoading(false);
  };

  // Calculs en temps réel basés sur les commandes du jour
  const stats = useMemo(() => {
    if (!commandes || commandes.length === 0) {
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
      (cmd) => cmd.details_paiement?.total_apres_reduction > 0
    );
    const panierMoyen =
      commandesPayees.length > 0
        ? chiffreAffaires / commandesPayees.length
        : 0;

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

    const meilleurProduit = Object.values(produitsCA).sort(
      (a, b) => b.ca - a.ca
    )[0] || null;

    // Ventes sur place
    const commandesSurPlace = commandes.filter(
      (cmd) => cmd.type === TYPES_COMMANDE.SUR_PLACE
    );
    const ventesSurPlace = {
      nombre: commandesSurPlace.length,
      ca: commandesSurPlace.reduce(
        (sum, cmd) => sum + (cmd.details_paiement?.total_apres_reduction || 0),
        0
      ),
    };

    // Ventes à livrer
    const commandesLivraison = commandes.filter(
      (cmd) => cmd.type === TYPES_COMMANDE.LIVRAISON
    );
    const ventesLivraison = {
      nombre: commandesLivraison.length,
      ca: commandesLivraison.reduce(
        (sum, cmd) => sum + (cmd.details_paiement?.total_apres_reduction || 0),
        0
      ),
    };

    // Livraisons en attente / total livraisons
    const livraisonsEnAttente = commandesLivraison.filter(
      (cmd) =>
        cmd.statut_livraison === STATUTS_LIVRAISON.EN_ATTENTE ||
        cmd.statut_livraison === STATUTS_LIVRAISON.EN_COURS
    ).length;
    const totalLivraisons = commandesLivraison.length;

    // Temps moyen de livraison (en minutes)
    const livraisonsTerminees = commandesLivraison.filter(
      (cmd) =>
        cmd.statut_livraison === STATUTS_LIVRAISON.LIVREE &&
        cmd.date_reelle_livraison &&
        cmd.heure_reelle_livraison &&
        cmd.created_at
    );

    let tempsMoyenLivraison = 0;
    if (livraisonsTerminees.length > 0) {
      const totalMinutes = livraisonsTerminees.reduce((sum, cmd) => {
        const created = new Date(cmd.created_at);
        const delivered = new Date(
          `${cmd.date_reelle_livraison}T${cmd.heure_reelle_livraison}`
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

  if (isLoading) {
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
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
              <p
                className={`${
                  isMobile ? "text-xl" : "text-2xl"
                } font-bold text-blue-600 dark:text-blue-400`}>
                {formatMontant(stats.chiffreAffaires)} FCFA
              </p>
            </div>
            <TrendingUp
              className={`${
                isMobile ? "w-6 h-6" : "w-8 h-8"
              } text-blue-500/30`}
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
              {stats.cadenceParHeure.toFixed(1)}
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
              {formatMontant(stats.panierMoyen)} F
            </p>
          </div>
        </div>

        {/* Meilleur produit */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-lg border border-amber-200 dark:border-amber-800 p-2">
          <div className="flex items-center gap-2">
            <Award
              className={`${
                isMobile ? "w-4 h-4" : "w-5 h-5"
              } text-amber-500`}
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
                {stats.meilleurProduit ? stats.meilleurProduit.nom : "Aucune vente"}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`${
                  isMobile ? "text-xs" : "text-sm"
                } font-semibold text-amber-600 dark:text-amber-400`}>
                {stats.meilleurProduit ? `${formatMontant(stats.meilleurProduit.ca)} F` : "-- F"}
              </p>
              <p
                className={`${
                  isMobile ? "text-[10px]" : "text-xs"
                } text-muted-foreground`}>
                {stats.meilleurProduit ? `${stats.meilleurProduit.quantite} vendus` : "0 vendu"}
              </p>
            </div>
          </div>
        </div>

        {/* Ventes sur place et à livrer */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Store
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-green-500`}
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
              {stats.ventesSurPlace.nombre} ventes
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-green-600 dark:text-green-400`}>
              {formatMontant(stats.ventesSurPlace.ca)} F
            </p>
          </div>
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-cyan-500`}
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
              {stats.ventesLivraison.nombre} ventes
            </p>
            <p
              className={`${
                isMobile ? "text-[10px]" : "text-xs"
              } text-cyan-600 dark:text-cyan-400`}>
              {formatMontant(stats.ventesLivraison.ca)} F
            </p>
          </div>
        </div>

        {/* Livraisons en attente et temps moyen */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/60 rounded-lg border border-border p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Package
                className={`${
                  isMobile ? "w-3 h-3" : "w-4 h-4"
                } text-rose-500`}
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
                {stats.livraisonsEnAttente}
              </span>
              <span className="text-muted-foreground">
                /{stats.totalLivraisons}
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
              {stats.tempsMoyenLivraison > 0
                ? `${Math.round(stats.tempsMoyenLivraison)} min`
                : "-- min"}
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
