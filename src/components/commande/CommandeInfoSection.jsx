import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, MessageSquare, Store, Truck } from "lucide-react";

/**
 * Section des informations client et type de commande
 */
const CommandeInfoSection = ({
  commande,
  canEdit,
  onUpdateField,
  TYPES_COMMANDE,
  errors = {},
  isFieldDirty,
}) => {
  if (!commande) return null;

  const handleChange = (field, value) => {
    if (canEdit) {
      onUpdateField(field, value);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Informations client
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Client */}
        <div className="space-y-2">
          <Label
            htmlFor="client"
            className={isFieldDirty?.("client") ? "text-amber-600" : ""}>
            Nom du client
          </Label>
          <Input
            id="client"
            value={commande.client || ""}
            onChange={(e) => handleChange("client", e.target.value)}
            disabled={!canEdit}
            placeholder="Nom du client"
            className={errors.client ? "border-red-500" : ""}
          />
          {errors.client && (
            <p className="text-xs text-red-500">{errors.client}</p>
          )}
        </div>

        {/* Contact client */}
        <div className="space-y-2">
          <Label
            htmlFor="contact_client"
            className={isFieldDirty?.("contact_client") ? "text-amber-600" : ""}>
            <Phone className="h-3 w-3 inline mr-1" />
            Contact principal
          </Label>
          <Input
            id="contact_client"
            value={commande.contact_client || ""}
            onChange={(e) => handleChange("contact_client", e.target.value)}
            disabled={!canEdit}
            placeholder="Numéro de téléphone"
            type="tel"
          />
        </div>

        {/* Contact alternatif */}
        <div className="space-y-2">
          <Label
            htmlFor="contact_alternatif"
            className={
              isFieldDirty?.("contact_alternatif") ? "text-amber-600" : ""
            }>
            <Phone className="h-3 w-3 inline mr-1" />
            Contact alternatif
          </Label>
          <Input
            id="contact_alternatif"
            value={commande.contact_alternatif || ""}
            onChange={(e) => handleChange("contact_alternatif", e.target.value)}
            disabled={!canEdit}
            placeholder="Numéro alternatif (optionnel)"
            type="tel"
          />
        </div>

        {/* Type de commande */}
        <div className="space-y-2">
          <Label
            className={isFieldDirty?.("type") ? "text-amber-600" : ""}>
            Type de commande
          </Label>
          <Select
            value={commande.type}
            onValueChange={(value) => handleChange("type", value)}
            disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue placeholder="Type de commande" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TYPES_COMMANDE.SUR_PLACE}>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Sur place
                </div>
              </SelectItem>
              <SelectItem value={TYPES_COMMANDE.LIVRAISON}>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Livraison
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Note/Commentaire */}
        <div className="space-y-2">
          <Label
            htmlFor="note"
            className={isFieldDirty?.("note") ? "text-amber-600" : ""}>
            <MessageSquare className="h-3 w-3 inline mr-1" />
            Note
          </Label>
          <Textarea
            id="note"
            value={commande.note || ""}
            onChange={(e) => handleChange("note", e.target.value)}
            disabled={!canEdit}
            placeholder="Ajouter une note (optionnel)"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CommandeInfoSection;
