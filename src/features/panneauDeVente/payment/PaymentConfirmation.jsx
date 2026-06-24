import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { CheckCircle, Printer, Plus, Copy } from "lucide-react";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { animateConfirmationScreen } from "@/lib/animations";
import { toast } from "sonner";

const PaymentConfirmation = ({ order, onNewOrder, onClose, className }) => {
  const containerRef = useRef(null);
  const iconRef = useRef(null);
  const messageRef = useRef(null);
  const cardRef = useRef(null);
  const actionsRef = useRef(null);

  useGSAP(() => {
    animateConfirmationScreen({
      container: containerRef.current,
      icon: iconRef.current,
      message: messageRef.current,
      card: cardRef.current,
      actions: actionsRef.current,
    });
  }, { scope: containerRef });

  if (!order) return null;

  const orderId = order.id?.slice(0, 8).toUpperCase() || "N/A";
  const total = order.details_paiement?.total_apres_reduction || 0;
  const isPaid = order.statut_paiement === "payee";

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("ID copié dans le presse-papier");
  };

  const handlePrint = () => {
    toast.info("Fonctionnalité d'impression à venir");
  };

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col items-center justify-center p-6", className)}>
      <div ref={iconRef}>
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>

      <div ref={messageRef} className="text-center mb-6">
        <h2 className="text-2xl font-bold text-green-600 mb-2">
          Commande créée !
        </h2>
        <p className="text-muted-foreground">
          La commande a été enregistrée avec succès
        </p>
      </div>

      <div ref={cardRef}>
        <Card className="p-4 mb-6 min-w-[280px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">N° Commande</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">
                  #{orderId}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyId}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="font-medium">{order.client}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold text-lg text-primary">
                {total.toLocaleString("fr-FR")} F
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Paiement</span>
              <span
                className={cn(
                  "text-sm font-medium px-2 py-0.5 rounded-full",
                  isPaid
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                )}>
                {isPaid ? "Payée" : "Non payée"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="capitalize">{order.type}</span>
            </div>
          </div>
        </Card>
      </div>

      <div ref={actionsRef} className="flex flex-col gap-2 w-full max-w-[280px]">
        <Button size="lg" onClick={onNewOrder}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle commande
        </Button>

        <Button variant="outline" size="lg" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Imprimer le ticket
        </Button>

        <Button variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
};

export { PaymentConfirmation };
