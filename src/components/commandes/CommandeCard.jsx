import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Edit,
  Trash2,
  Phone,
  MapPin,
  Clock,
  Truck,
  Store,
  Package,
  ChefHat,
  CircleDollarSign,
  Tag,
  Percent,
  CheckCircle,
  CheckCheck,
} from "lucide-react";
import * as commandeToolkit from "@/utils/commandeToolkit";

// ============================================================================
// LABELS LISIBLES POUR LES STATUTS
// ============================================================================

const STATUT_COMMANDE_LABELS = {
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

const STATUT_LIVRAISON_LABELS = {
  en_attente: "En attente",
  en_cours: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

const STATUT_PAIEMENT_LABELS = {
  non_payee: "Non payée",
  partiellement_payee: "Partielle",
  payee: "Payée",
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const CommandeCard = ({
  commande,
  onEdit,
  onDelete,
  onDeliver,
  onDeliverAndClose,
  canUpdate = true,
  canDelete = false,
  showDeliverButton = false,
  viewMode = "grid",
  isMobile = false,
}) => {
  const isLivraison =
    commande.type === commandeToolkit.TYPES_COMMANDE.LIVRAISON;

  // Calculer les totaux
  const total = commande.details_paiement?.total || 0;
  const totalApresReduction =
    commande.details_paiement?.total_apres_reduction || total;
  const totalPaye =
    (commande.details_paiement?.momo || 0) +
    (commande.details_paiement?.cash || 0) +
    (commande.details_paiement?.autre || 0);
  const resteAPayer = Math.max(0, totalApresReduction - totalPaye);
  const hasPromotion = commande.promotion && commande.promotion.valeur > 0;

  // ============================================================================
  // COULEURS DES BADGES
  // ============================================================================

  const getStatutCommandeVariant = (statut) => {
    switch (statut) {
      case commandeToolkit.STATUTS_COMMANDE.EN_COURS:
        return "default"; // Bleu
      case commandeToolkit.STATUTS_COMMANDE.TERMINEE:
        return "success"; // Vert
      case commandeToolkit.STATUTS_COMMANDE.ANNULEE:
        return "destructive"; // Rouge
      default:
        return "secondary";
    }
  };

  const getStatutLivraisonClass = (statut) => {
    switch (statut) {
      case commandeToolkit.STATUTS_LIVRAISON.EN_ATTENTE:
        return "bg-amber-500 hover:bg-amber-600";
      case commandeToolkit.STATUTS_LIVRAISON.EN_COURS:
        return "bg-blue-500 hover:bg-blue-600";
      case commandeToolkit.STATUTS_LIVRAISON.LIVREE:
        return "bg-emerald-500 hover:bg-emerald-600";
      case commandeToolkit.STATUTS_LIVRAISON.ANNULEE:
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500";
    }
  };

  const getStatutPaiementClass = (statut) => {
    switch (statut) {
      case commandeToolkit.STATUTS_PAIEMENT.NON_PAYEE:
        return "bg-red-500 hover:bg-red-600";
      case commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE:
        return "bg-amber-500 hover:bg-amber-600";
      case commandeToolkit.STATUTS_PAIEMENT.PAYEE:
        return "bg-emerald-500 hover:bg-emerald-600";
      default:
        return "bg-gray-500";
    }
  };

  // ============================================================================
  // FORMATER LA DATE/HEURE
  // ============================================================================

  const formatDateTime = () => {
    if (!commande.created_at) return null;
    const date = new Date(commande.created_at);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================================
  // RENDU VUE LISTE MOBILE
  // ============================================================================

  if (viewMode === "list" && isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full">
        <Card className="flex flex-row items-center gap-3 p-3 hover:shadow-md transition-shadow">
          {/* Colonne 1: Type + ID + Heure */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-md ${
                isLivraison
                  ? "bg-blue-100 text-blue-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
              {isLivraison ? (
                <Truck className="w-4 h-4" />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-mono text-xs font-semibold text-primary">
                #{commande.id.slice(0, 6).toUpperCase()}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDateTime()}
              </div>
            </div>
          </div>

          {/* Colonne 2: Client + Contact */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-xs truncate">
              {commande.client}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
              <Phone className="w-2.5 h-2.5 flex-shrink-0" />
              {commande.contact_client || "N/A"}
            </div>
          </div>

          {/* Colonne 3: Articles + Prix/Badge paiement */}
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="w-3 h-3" />
              <span>{commande.details_commandes?.length || 0} art.</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-primary">
                {totalApresReduction.toLocaleString()} F
              </span>
              <Badge
                className={`text-white text-[9px] px-1 py-0 ${getStatutPaiementClass(
                  commande.statut_paiement,
                )}`}>
                {commande.statut_paiement === commandeToolkit.STATUTS_PAIEMENT.PAYEE ? "Payée" : "Non payée"}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(commande)}>
                <Edit className="w-3.5 h-3.5" />
              </Button>
            )}
            {showDeliverButton && onDeliver && (
              <Button
                size="sm"
                className="h-7 px-2 bg-green-600 hover:bg-green-700"
                onClick={() => onDeliver(commande)}>
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            {showDeliverButton && onDeliverAndClose && (
              <Button
                size="sm"
                className="h-7 px-2 bg-primary hover:bg-primary/90"
                onClick={() => onDeliverAndClose(commande)}>
                <CheckCheck className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // ============================================================================
  // RENDU VUE LISTE DESKTOP
  // ============================================================================

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full">
        <Card className="flex flex-row items-center gap-4 p-4 hover:shadow-md transition-shadow">
          {/* Type + ID */}
          <div className="flex items-center gap-3 min-w-[180px]">
            <div
              className={`p-2 rounded-lg ${
                isLivraison
                  ? "bg-blue-100 text-blue-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
              {isLivraison ? (
                <Truck className="w-5 h-5" />
              ) : (
                <Store className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-mono text-sm font-semibold text-primary">
                #{commande.id.slice(0, 8).toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDateTime()}
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="flex-1 min-w-[150px]">
            <div className="font-medium text-sm truncate">
              {commande.client}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {commande.contact_client || "N/A"}
            </div>
          </div>

          {/* Articles count */}
          <div className="flex items-center gap-1 min-w-[80px]">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {commande.details_commandes?.length || 0} article
              {(commande.details_commandes?.length || 0) > 1 ? "s" : ""}
            </span>
          </div>

          {/* Statuts */}
          <div className="flex gap-1 min-w-[200px]">
            <Badge variant={getStatutCommandeVariant(commande.statut_commande)}>
              {STATUT_COMMANDE_LABELS[commande.statut_commande]}
            </Badge>
            {isLivraison && (
              <Badge
                className={`text-white ${getStatutLivraisonClass(
                  commande.statut_livraison,
                )}`}>
                {STATUT_LIVRAISON_LABELS[commande.statut_livraison]}
              </Badge>
            )}
            <Badge
              className={`text-white ${getStatutPaiementClass(
                commande.statut_paiement,
              )}`}>
              {STATUT_PAIEMENT_LABELS[commande.statut_paiement]}
            </Badge>
            {/* Badge Promotion en vue liste */}
            {hasPromotion && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-0.5">
                {commande.promotion.type === "pourcentage" ? (
                  <>
                    <Percent className="w-3 h-3" />
                    <span>{commande.promotion.valeur}</span>
                  </>
                ) : (
                  <>
                    <span>-</span>
                    <span>{commande.promotion.valeur.toLocaleString()} F</span>
                  </>
                )}
              </Badge>
            )}
          </div>

          {/* Total */}
          <div className="text-right min-w-[100px]">
            <div className="font-semibold text-primary">
              {totalApresReduction.toLocaleString()} F
            </div>
            {resteAPayer > 0 && (
              <div className="text-xs text-red-500">
                Reste: {resteAPayer.toLocaleString()} F
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-2">
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(commande)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {showDeliverButton && onDeliver && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => onDeliver(commande)}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Livrer
              </Button>
            )}
            {showDeliverButton && onDeliverAndClose && (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => onDeliverAndClose(commande)}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Livrer et clôturer
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(commande)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // ============================================================================
  // RENDU VUE GRILLE (par défaut)
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="h-full">
      <Card className="h-[420px] flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
        {/* ================================================================== */}
        {/* EN-TÊTE: Type, ID, Client, Statuts */}
        {/* ================================================================== */}
        <div className="px-3 py-2 border-b bg-muted/20 space-y-1.5">
          {/* Ligne 1: Type + ID + Client + Heure */}
          <div className="flex items-center gap-2">
            <div
              className={`p-1 rounded-md ${
                isLivraison
                  ? "bg-blue-100 text-blue-600"
                  : "bg-emerald-100 text-emerald-600"
              }`}>
              {isLivraison ? (
                <Truck className="w-4 h-4" />
              ) : (
                <Store className="w-4 h-4" />
              )}
            </div>
            <span className="font-mono text-xs font-bold text-primary">
              #{commande.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="font-semibold text-sm truncate flex-1">
              {commande.client}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDateTime()}
            </span>
          </div>

          {/* Ligne 2: Contact + Lieu */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="w-3 h-3" />
            <span>{commande.contact_client || "N/A"}</span>
            {isLivraison && commande.lieu_livraison && (
              <>
                <span>•</span>
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">
                  {commande.lieu_livraison.quartier || commande.lieu_livraison.commune || "Adresse..."}
                </span>
              </>
            )}
          </div>

          {/* Ligne 3: Badges Statuts + Promotion */}
          <div className="flex gap-1.5 flex-wrap">
            <Badge
              variant={getStatutCommandeVariant(commande.statut_commande)}
              className="text-[10px] px-1.5 py-0.5">
              {STATUT_COMMANDE_LABELS[commande.statut_commande]}
            </Badge>
            {isLivraison && (
              <Badge
                className={`text-white text-[10px] px-1.5 py-0.5 ${getStatutLivraisonClass(
                  commande.statut_livraison,
                )}`}>
                {STATUT_LIVRAISON_LABELS[commande.statut_livraison]}
              </Badge>
            )}
            <Badge
              className={`text-white text-[10px] px-1.5 py-0.5 ${getStatutPaiementClass(
                commande.statut_paiement,
              )}`}>
              {STATUT_PAIEMENT_LABELS[commande.statut_paiement]}
            </Badge>
            {/* Badge Promotion */}
            {hasPromotion && (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                {commande.promotion.type === "pourcentage" ? (
                  <>
                    <Percent className="w-2.5 h-2.5" />
                    <span>{commande.promotion.valeur}</span>
                  </>
                ) : (
                  <>
                    <span>-</span>
                    <span>{commande.promotion.valeur.toLocaleString()} F</span>
                  </>
                )}
              </Badge>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* ARTICLES - ZONE PRINCIPALE SCROLLABLE */}
        {/* ================================================================== */}
        <CardContent className="flex-1 min-h-0 overflow-hidden py-0.5 px-3 flex flex-col">
          {/* Header fixe */}
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <div className="flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                Articles
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {commande.details_commandes?.length || 0} item
              {(commande.details_commandes?.length || 0) > 1 ? "s" : ""}
            </Badge>
          </div>

          {/* Zone scrollable avec indicateur visuel */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-md border bg-background/50 p-2">
            {commande.details_commandes &&
            commande.details_commandes.length > 0 ? (
              <div className="space-y-1">
                {commande.details_commandes.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                        {item.quantite}x
                      </span>
                      <span className="truncate font-medium">
                        {item.item || item.nom}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[10px] ml-2 flex-shrink-0 font-medium">
                      {(
                        item.total || item.quantite * item.prix_unitaire
                      ).toLocaleString()}{" "}
                      F
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                <Package className="w-6 h-6 mb-1 opacity-40" />
                Aucun article
              </div>
            )}
          </div>
        </CardContent>

        {/* ================================================================== */}
        {/* FOOTER ULTRA COMPACT: Total + Actions sur une ligne */}
        {/* ================================================================== */}
        <CardFooter className="flex items-center justify-between gap-2 py-1.5 px-2.5 border-t bg-muted/20">
          {/* Total + Promo + Reste */}
          <div className="flex items-center gap-1.5">
            <CircleDollarSign className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-primary">
              {totalApresReduction.toLocaleString()} F
            </span>
            {hasPromotion && (
              <span className="text-[9px] text-emerald-600 flex items-center">
                {commande.promotion.type === "pourcentage" ? (
                  <Percent className="w-2 h-2" />
                ) : (
                  <Tag className="w-2 h-2" />
                )}
                -{commande.promotion.valeur}
                {commande.promotion.type === "pourcentage" ? "%" : "F"}
              </span>
            )}
            {commande.statut_paiement ===
              commandeToolkit.STATUTS_PAIEMENT.PARTIELLEMENT_PAYEE && (
              <span className="text-[9px] text-red-500 font-medium ml-1">
                (reste {resteAPayer.toLocaleString()})
              </span>
            )}
          </div>

          {/* Boutons d'actions */}
          <div className="flex gap-1">
            {canUpdate && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={() => onEdit(commande)}>
                <Edit className="w-3 h-3 mr-0.5" />
                Éditer
              </Button>
            )}
            {showDeliverButton && onDeliver && (
              <Button
                size="sm"
                className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700"
                onClick={() => onDeliver(commande)}>
                <CheckCircle className="w-3 h-3 mr-0.5" />
                Livrer
              </Button>
            )}
            {showDeliverButton && onDeliverAndClose && (
              <Button
                size="sm"
                className="h-6 px-2 text-[10px] bg-primary hover:bg-primary/90"
                onClick={() => onDeliverAndClose(commande)}>
                <CheckCheck className="w-3 h-3 mr-0.5" />
                Clôturer
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-6 w-6 p-0"
                onClick={() => onDelete(commande)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default CommandeCard;
