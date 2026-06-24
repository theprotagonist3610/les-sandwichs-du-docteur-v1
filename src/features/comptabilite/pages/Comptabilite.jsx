import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { staggerFadeInUp } from "@/lib/animations";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calculator,
  ChartLine,
  PiggyBank,
  Lock,
  BarChart3,
  ChevronRight,
} from "lucide-react";

const SECTIONS = [
  {
    name: "encaissement",
    label: "Encaissement",
    description: "Enregistrer et gérer les encaissements",
    path: "/encaissement",
    icon: TrendingUp,
    accent: "bg-emerald-500",
    roles: ["superviseur", "admin"],
  },
  {
    name: "depense",
    label: "Dépense",
    description: "Enregistrer et suivre les dépenses",
    path: "/depense",
    icon: TrendingDown,
    accent: "bg-red-500",
    roles: ["superviseur", "admin"],
  },
  {
    name: "caisse",
    label: "Caisse",
    description: "Trésorerie et soldes",
    path: "/caisse",
    icon: Wallet,
    accent: "bg-blue-500",
    roles: ["superviseur", "admin"],
  },
  {
    name: "budget",
    label: "Budget",
    description: "Budgets mensuels",
    path: "/budget",
    icon: Calculator,
    accent: "bg-purple-500",
    roles: ["admin"],
  },
  {
    name: "prevision",
    label: "Prévision",
    description: "Prévisions financières",
    path: "/prevision",
    icon: ChartLine,
    accent: "bg-orange-500",
    roles: ["superviseur", "admin"],
  },
  {
    name: "revenu",
    label: "Revenu",
    description: "Revenus et rentabilité",
    path: "/revenu",
    icon: PiggyBank,
    accent: "bg-teal-500",
    roles: ["admin"],
  },
  {
    name: "cloture",
    label: "Clôture",
    description: "Clôturer la journée",
    path: "/cloture",
    icon: Lock,
    accent: "bg-slate-500",
    roles: ["superviseur", "admin"],
  },
  {
    name: "stats",
    label: "Statistiques",
    description: "Analyses et graphiques",
    path: "/stats",
    icon: BarChart3,
    accent: "bg-amber-500",
    roles: ["superviseur", "admin"],
  },
];

const Comptabilite = () => {
  const navigate = useNavigate();
  const { user } = useActiveUserStore();
  const gridRef = useRef(null);

  const items = useMemo(
    () => SECTIONS.filter((s) => s.roles.includes(user?.role)),
    [user?.role]
  );

  useGSAP(
    () => { staggerFadeInUp(".compta-card", { stagger: 0.05 }); },
    { scope: gridRef }
  );

  return (
    <div className="min-h-screen px-4 lg:px-8 py-4 lg:py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8">COMPTABILITÉ</h1>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                onClick={() => navigate(item.path)}
                className="compta-card flex items-center gap-4 p-4 lg:p-5 bg-card border-3 border-foreground shadow-[4px_4px_0px_var(--foreground)] hover:shadow-[6px_6px_0px_var(--foreground)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 cursor-pointer"
              >
                <div className={`shrink-0 p-3 ${item.accent} text-white border-2 border-foreground`}>
                  <Icon className="size-6" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold uppercase tracking-wide text-sm">{item.label}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Comptabilite;
