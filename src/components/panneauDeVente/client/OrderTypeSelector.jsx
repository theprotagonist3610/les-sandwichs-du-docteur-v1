import { cn } from "@/lib/utils";
import { Store, Truck } from "lucide-react";
import * as commandeToolkit from "@/utils/commandeToolkit";

/**
 * Sélecteur du type de commande (Sur place / Livraison)
 */
const OrderTypeSelector = ({ value, onChange, className }) => {
  const types = [
    {
      value: commandeToolkit.TYPES_COMMANDE.SUR_PLACE,
      label: "Sur place",
      icon: Store,
      color: "emerald",
    },
    {
      value: commandeToolkit.TYPES_COMMANDE.LIVRAISON,
      label: "Livraison",
      icon: Truck,
      color: "blue",
    },
  ];

  return (
    <div className={cn("flex gap-2", className)}>
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = value === type.value;
        const colorClasses = {
          emerald: isActive
            ? "bg-emerald-100 border-emerald-500 text-emerald-700"
            : "hover:bg-emerald-50 hover:border-emerald-200",
          blue: isActive
            ? "bg-blue-100 border-blue-500 text-blue-700"
            : "hover:bg-blue-50 hover:border-blue-200",
        };

        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
              colorClasses[type.color],
              !isActive && "border-border"
            )}>
            <Icon className="w-5 h-5" />
            <span className="font-medium">{type.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default OrderTypeSelector;
