import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  DollarSign,
  Edit,
} from "lucide-react";

/**
 * Section livraison (adresse, livreur, date/heure, frais)
 */
const CommandeLivraisonSection = ({
  commande,
  livreurs = [],
  canEdit,
  onUpdateField,
  onAssignLivreur,
  onSelectAdresse,
  isFieldDirty,
  selectedAdresse,
}) => {
  if (!commande) return null;

  // Ne pas afficher si pas de livraison
  if (commande.type !== "livraison") {
    return null;
  }

  const handleChange = (field, value) => {
    if (canEdit) {
      onUpdateField(field, value);
    }
  };

  // Formater le prix
  const formatPrice = (price) => {
    return new Intl.NumberFormat("fr-FR").format(price || 0) + " FCFA";
  };

  // Formater l'affichage de l'adresse (commune, quartier - filtre les undefined)
  const formatAdresseDisplay = () => {
    if (!selectedAdresse && !commande.lieu_livraison) {
      return "";
    }

    // Si on a une adresse sélectionnée avec détails
    if (selectedAdresse) {
      const parts = [
        selectedAdresse.commune,
        selectedAdresse.quartier,
      ].filter(Boolean);
      return parts.join(", ");
    }

    // Sinon utiliser lieu_livraison brut
    return commande.lieu_livraison || "";
  };

  // Trouver le livreur assigné
  const assignedLivreur = commande.livreur_id
    ? livreurs.find((l) => l.id === commande.livreur_id)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Informations de livraison
          {commande.statut_livraison && (
            <Badge
              className={
                commande.statut_livraison === "livree"
                  ? "bg-emerald-500"
                  : "bg-amber-500"
              }>
              {commande.statut_livraison === "livree" ? "Livrée" : "En attente"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adresse de livraison */}
        <div className="space-y-2">
          <Label
            className={
              isFieldDirty?.("lieu_livraison") ? "text-amber-600" : ""
            }>
            <MapPin className="h-3 w-3 inline mr-1" />
            Adresse de livraison
          </Label>
          <div className="flex gap-2">
            <Input
              value={formatAdresseDisplay()}
              onChange={(e) => handleChange("lieu_livraison", e.target.value)}
              disabled={!canEdit}
              placeholder="Adresse de livraison"
              className="flex-1"
              readOnly
            />
            {canEdit && (
              <Button variant="outline" size="icon" onClick={onSelectAdresse}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Livreur */}
        <div className="space-y-2">
          <Label
            className={isFieldDirty?.("livreur_id") ? "text-amber-600" : ""}>
            <User className="h-3 w-3 inline mr-1" />
            Livreur assigné
          </Label>
          <Select
            value={commande.livreur_id || "none"}
            onValueChange={(value) =>
              onAssignLivreur(value === "none" ? null : value)
            }
            disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un livreur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Non assigné</SelectItem>
              {livreurs.map((livreur) => (
                <SelectItem key={livreur.id} value={livreur.id}>
                  {livreur.denomination}
                  {livreur.contact && (
                    <span className="text-muted-foreground ml-2">
                      ({livreur.contact})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {assignedLivreur && (
            <p className="text-xs text-muted-foreground">
              Contact: {assignedLivreur.contact || "Non renseigné"}
            </p>
          )}
        </div>

        {/* Date et heure prévues */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              className={
                isFieldDirty?.("date_livraison") ? "text-amber-600" : ""
              }>
              <Calendar className="h-3 w-3 inline mr-1" />
              Date prévue
            </Label>
            <Input
              type="date"
              value={commande.date_livraison || ""}
              onChange={(e) => handleChange("date_livraison", e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label
              className={
                isFieldDirty?.("heure_livraison") ? "text-amber-600" : ""
              }>
              <Clock className="h-3 w-3 inline mr-1" />
              Heure prévue
            </Label>
            <Input
              type="time"
              value={commande.heure_livraison || ""}
              onChange={(e) => handleChange("heure_livraison", e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Date et heure réelles (si livrée) */}
        {commande.statut_livraison === "livree" && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div>
              <Label className="text-emerald-700 text-xs">Date réelle</Label>
              <p className="font-medium text-emerald-800">
                {commande.date_reelle_livraison || "Non renseignée"}
              </p>
            </div>
            <div>
              <Label className="text-emerald-700 text-xs">Heure réelle</Label>
              <p className="font-medium text-emerald-800">
                {commande.heure_reelle_livraison || "Non renseignée"}
              </p>
            </div>
          </div>
        )}

        {/* Frais de livraison */}
        <div className="space-y-2">
          <Label
            className={
              isFieldDirty?.("frais_livraison") ? "text-amber-600" : ""
            }>
            <DollarSign className="h-3 w-3 inline mr-1" />
            Frais de livraison
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={commande.frais_livraison || 0}
              onChange={(e) =>
                handleChange("frais_livraison", parseInt(e.target.value) || 0)
              }
              disabled={!canEdit}
              min="0"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">FCFA</span>
          </div>
        </div>

        {/* Instructions de livraison */}
        <div className="space-y-2">
          <Label
            className={
              isFieldDirty?.("instructions_livraison") ? "text-amber-600" : ""
            }>
            Instructions de livraison
          </Label>
          <Textarea
            value={commande.instructions_livraison || ""}
            onChange={(e) =>
              handleChange("instructions_livraison", e.target.value)
            }
            disabled={!canEdit}
            placeholder="Instructions spéciales pour la livraison"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandeLivraisonSection;
