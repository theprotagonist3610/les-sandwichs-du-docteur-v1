import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Printer, Plus, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

/**
 * Écran de confirmation après création de commande
 */
const PaymentConfirmation = ({ order, onNewOrder, onClose, className }) => {
  if (!order) return null;

  const orderId = order.id?.slice(0, 8).toUpperCase() || "N/A";
  const total = order.details_paiement?.total_apres_reduction || 0;
  const isPaid = order.statut_paiement === "payee";

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("ID copié dans le presse-papier");
  };

  const handlePrint = () => {
    // TODO: Implémenter l'impression du ticket
    toast.info("Fonctionnalité d'impression à venir");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center p-6", className)}>
      {/* Icône succès */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-6">
        <h2 className="text-2xl font-bold text-green-600 mb-2">
          Commande créée !
        </h2>
        <p className="text-muted-foreground">
          La commande a été enregistrée avec succès
        </p>
      </motion.div>

      {/* Détails */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}>
        <Card className="p-4 mb-6 min-w-[280px]">
          <div className="space-y-3">
            {/* ID Commande */}
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

            {/* Client */}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Client</span>
              <span className="font-medium">{order.client}</span>
            </div>

            {/* Total */}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-bold text-lg text-primary">
                {total.toLocaleString("fr-FR")} F
              </span>
            </div>

            {/* Statut paiement */}
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

            {/* Type */}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="capitalize">{order.type}</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-2 w-full max-w-[280px]">
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
      </motion.div>
    </motion.div>
  );
};

export default PaymentConfirmation;
