import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useBreakpoint from "@/hooks/useBreakpoint";
import { supabase } from "@/config/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  RefreshCw,
  Loader2,
  Clock,
  Package,
  CheckCircle,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CommandeCard from "@/components/commandes/CommandeCard";
import * as commandeToolkit from "@/utils/commandeToolkit";
import { toast } from "sonner";

/**
 * Vue Mobile des commandes en attente de livraison
 * Interface optimisée pour écrans tactiles
 */
const MobileCommandesEnAttente = () => {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // États locaux
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatutPaiement, setFilterStatutPaiement] = useState("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Charger les commandes en attente
  const loadCommandes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { commandes: data, error: err } =
        await commandeToolkit.getAllCommandes({
          type: commandeToolkit.TYPES_COMMANDE.LIVRAISON,
          statut_livraison: commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE,
          statut_commande: commandeToolkit.STATUTS_COMMANDE.EN_COURS,
        });

      if (err) {
        setError(err.message || "Erreur lors du chargement");
      } else {
        setCommandes(data || []);
      }
    } catch (err) {
      setError("Une erreur est survenue");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    if (visible) {
      loadCommandes();
    }
  }, [visible, loadCommandes]);

  // Realtime
  useEffect(() => {
    if (!visible) return;

    const channel = supabase
      .channel("commandes_en_attente_mobile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commandes",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newCommande = payload.new;
            if (
              newCommande.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON &&
              newCommande.statut_livraison ===
                commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE &&
              newCommande.statut_commande ===
                commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) => [newCommande, ...prev]);
              toast.info("Nouvelle commande", {
                description: `Client: ${newCommande.client}`,
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedCommande = payload.new;
            if (
              updatedCommande.statut_livraison !==
                commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE ||
              updatedCommande.statut_commande !==
                commandeToolkit.STATUTS_COMMANDE.EN_COURS
            ) {
              setCommandes((prev) =>
                prev.filter((c) => c.id !== updatedCommande.id)
              );
            } else {
              setCommandes((prev) =>
                prev.map((c) =>
                  c.id === updatedCommande.id ? updatedCommande : c
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            setCommandes((prev) =>
              prev.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible]);

  // Filtrer les commandes
  const filteredCommandes = commandes
    .filter((commande) => {
      const matchSearch =
        !searchTerm ||
        commande.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.contact_client
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchStatutPaiement =
        filterStatutPaiement === "all" ||
        commande.statut_paiement === filterStatutPaiement;

      return matchSearch && matchStatutPaiement;
    })
    // Trier du plus récent au plus ancien
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Stats rapides
  const statsNonPayees = commandes.filter(
    (c) => c.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE
  ).length;
  const statsPayees = commandes.filter(
    (c) => c.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.PAYEE
  ).length;

  // Naviguer vers la commande
  const handleEditCommande = (commande) => {
    navigate(`/commande?id=${commande.id}`);
  };

  // Marquer comme livré
  const handleMarkAsDelivered = async (commande) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Erreur", { description: "Vous devez être connecté pour effectuer cette action" });
        return;
      }

      const { error: err } = await commandeToolkit.updateStatutLivraison(
        commande.id,
        commandeToolkit.STATUTS_LIVRAISON.LIVREE,
        commande.version
      );

      if (err) {
        toast.error("Erreur", { description: err.message });
      } else {
        // Retirer la commande de la liste locale (elle n'est plus en attente)
        setCommandes((prev) => prev.filter((c) => c.id !== commande.id));
        toast.success("Livraison confirmée");
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

  // Livrer et clôturer la commande en une seule opération
  const handleDeliverAndClose = async (commande) => {
    try {
      // Vérifier que l'utilisateur est authentifié
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Erreur", { description: "Vous devez être connecté pour effectuer cette action" });
        return;
      }

      const { error } = await commandeToolkit.deliverAndCloseCommande(
        commande.id,
        commande.version
      );

      if (error) {
        toast.error("Erreur", { description: error.message });
      } else {
        // Retirer la commande de la liste locale (elle est terminée)
        setCommandes((prev) => prev.filter((c) => c.id !== commande.id));
        toast.success("Commande livrée et clôturée");
      }
    } catch (err) {
      toast.error("Erreur", { description: err.message });
    }
  };

  return (
    <div
      className="min-h-screen pb-20"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header fixe */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/commandes")}
              className="h-8 w-8 -ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Clock className="w-6 h-6 text-orange-500" />
            <h1 className="text-lg font-semibold">En Attente</h1>
            <Badge variant="secondary">{commandes.length}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadCommandes}
            disabled={loading}>
            <RefreshCw
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 h-10"
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Statut de paiement
                  </label>
                  <Select
                    value={filterStatutPaiement}
                    onValueChange={(value) => {
                      setFilterStatutPaiement(value);
                      setFilterSheetOpen(false);
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les paiements</SelectItem>
                      <SelectItem
                        value={commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE}>
                        Non payée
                      </SelectItem>
                      <SelectItem
                        value={
                          commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE
                        }>
                        Partiellement payée
                      </SelectItem>
                      <SelectItem
                        value={commandeToolkit.STATUTS_PAIEMENT.PAYEE}>
                        Payée
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFilterStatutPaiement("all");
                    setSearchTerm("");
                    setFilterSheetOpen(false);
                  }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="bg-card border rounded-lg p-3 text-center">
          <Clock className="w-5 h-5 mx-auto text-orange-500 mb-1" />
          <p className="text-xl font-bold">{commandes.length}</p>
          <p className="text-xs text-muted-foreground">En attente</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <Package className="w-5 h-5 mx-auto text-red-500 mb-1" />
          <p className="text-xl font-bold">{statsNonPayees}</p>
          <p className="text-xs text-muted-foreground">Non payées</p>
        </div>
        <div className="bg-card border rounded-lg p-3 text-center">
          <CheckCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-xl font-bold">{statsPayees}</p>
          <p className="text-xs text-muted-foreground">Payées</p>
        </div>
      </div>

      {error && (
        <div className="mx-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste des commandes */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredCommandes.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">Aucune commande en attente</p>
            <p className="text-sm text-muted-foreground mt-1">
              Toutes les commandes ont été traitées
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredCommandes.map((commande) => (
              <motion.div
                key={commande.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}>
                <CommandeCard
                  commande={commande}
                  onEdit={handleEditCommande}
                  onDeliver={handleMarkAsDelivered}
                  onDeliverAndClose={handleDeliverAndClose}
                  showDeliverButton={true}
                  viewMode="list"
                  isMobile={true}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default MobileCommandesEnAttente;
