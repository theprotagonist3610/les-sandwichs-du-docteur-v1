import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, MapPin, MessageSquare } from "lucide-react";
import OrderTypeSelector from "./OrderTypeSelector";
import * as commandeToolkit from "@/utils/commandeToolkit";

/**
 * Formulaire d'informations client et type de commande
 */
const ClientInfo = ({
  client,
  contactClient,
  orderType,
  deliveryInfo,
  onClientChange,
  onOrderTypeChange,
  onDeliveryChange,
  compact = false,
  className,
}) => {
  // État local pour les champs
  const [localClient, setLocalClient] = useState(client || "");
  const [localContact, setLocalContact] = useState(contactClient || "");
  const [localAddress, setLocalAddress] = useState("");
  const [localInstructions, setLocalInstructions] = useState(
    deliveryInfo?.instructions_livraison || ""
  );

  // Synchroniser avec les props
  useEffect(() => {
    setLocalClient(client || "");
    setLocalContact(contactClient || "");
    setLocalInstructions(deliveryInfo?.instructions_livraison || "");
  }, [client, contactClient, deliveryInfo]);

  // Mettre à jour les infos client
  const handleClientBlur = () => {
    onClientChange({
      client: localClient || "non identifie",
      contact_client: localContact,
    });
  };

  // Mettre à jour les infos livraison
  const handleDeliveryBlur = () => {
    if (orderType === commandeToolkit.TYPES_COMMANDE.LIVRAISON) {
      onDeliveryChange({
        ...deliveryInfo,
        lieu_livraison: localAddress
          ? { adresse: localAddress }
          : deliveryInfo?.lieu_livraison,
        instructions_livraison: localInstructions,
      });
    }
  };

  const isDelivery = orderType === commandeToolkit.TYPES_COMMANDE.LIVRAISON;

  if (compact) {
    // Version compacte pour mobile
    return (
      <div className={cn("space-y-3", className)}>
        {/* Type de commande */}
        <OrderTypeSelector value={orderType} onChange={onOrderTypeChange} />

        {/* Nom client */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Nom du client"
            value={localClient}
            onChange={(e) => setLocalClient(e.target.value)}
            onBlur={handleClientBlur}
            className="pl-9 h-10"
          />
        </div>

        {/* Téléphone */}
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="tel"
            placeholder="Téléphone"
            value={localContact}
            onChange={(e) => setLocalContact(e.target.value)}
            onBlur={handleClientBlur}
            className="pl-9 h-10"
          />
        </div>

        {/* Adresse livraison (si livraison) */}
        {isDelivery && (
          <>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                placeholder="Adresse de livraison"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                onBlur={handleDeliveryBlur}
                className="pl-9 min-h-[60px] resize-none"
              />
            </div>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Textarea
                placeholder="Instructions (optionnel)"
                value={localInstructions}
                onChange={(e) => setLocalInstructions(e.target.value)}
                onBlur={handleDeliveryBlur}
                className="pl-9 min-h-[50px] resize-none"
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Version standard
  return (
    <div className={cn("space-y-4", className)}>
      {/* Type de commande */}
      <div className="space-y-2">
        <Label>Type de commande</Label>
        <OrderTypeSelector value={orderType} onChange={onOrderTypeChange} />
      </div>

      {/* Infos client */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="client">Nom du client</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="client"
              type="text"
              placeholder="Non identifié"
              value={localClient}
              onChange={(e) => setLocalClient(e.target.value)}
              onBlur={handleClientBlur}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">Téléphone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="contact"
              type="tel"
              placeholder="00 00 00 00"
              value={localContact}
              onChange={(e) => setLocalContact(e.target.value)}
              onBlur={handleClientBlur}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Infos livraison (si livraison) */}
      {isDelivery && (
        <div className="space-y-3 pt-2 border-t">
          <Label className="flex items-center gap-2 text-blue-600">
            <MapPin className="w-4 h-4" />
            Informations de livraison
          </Label>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              placeholder="Adresse complète de livraison"
              value={localAddress}
              onChange={(e) => setLocalAddress(e.target.value)}
              onBlur={handleDeliveryBlur}
              className="min-h-[70px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (optionnel)</Label>
            <Textarea
              id="instructions"
              placeholder="Ex: Sonner au portail, appeler en arrivant..."
              value={localInstructions}
              onChange={(e) => setLocalInstructions(e.target.value)}
              onBlur={handleDeliveryBlur}
              className="min-h-[60px] resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInfo;
