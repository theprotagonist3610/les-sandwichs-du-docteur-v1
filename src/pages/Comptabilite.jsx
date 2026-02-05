import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import useActiveUserStore from "@/store/activeUserStore";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calculator,
  ChartLine,
  PiggyBank,
  ChevronRight,
} from "lucide-react";

const liste = [
  {
    name: "encaissement",
    label: "Encaissement",
    description: "Enregistrer et gérer les encaissements de la journée",
    path: "/encaissement",
    icon: TrendingUp,
    bgColor: "bg-emerald-50 dark:bg-emerald-950",
    color: "text-emerald-600 dark:text-emerald-400",
    roles: ["superviseur", "admin"],
  },
  {
    name: "depense",
    label: "Dépense",
    description: "Enregistrer et suivre les dépenses",
    path: "/depense",
    icon: TrendingDown,
    bgColor: "bg-red-50 dark:bg-red-950",
    color: "text-red-600 dark:text-red-400",
    roles: ["superviseur", "admin"],
  },
  {
    name: "caisse",
    label: "Caisse",
    description: "Vue d'ensemble de la trésorerie et des soldes",
    path: "/caisse",
    icon: Wallet,
    bgColor: "bg-blue-50 dark:bg-blue-950",
    color: "text-blue-600 dark:text-blue-400",
    roles: ["superviseur", "admin"],
  },
  {
    name: "budget",
    label: "Budget",
    description: "Créer et suivre les budgets mensuels",
    path: "/budget",
    icon: Calculator,
    bgColor: "bg-purple-50 dark:bg-purple-950",
    color: "text-purple-600 dark:text-purple-400",
    roles: ["admin"],
  },
  {
    name: "prevision",
    label: "Prévision",
    description: "Établir les prévisions financières",
    path: "/prevision",
    icon: ChartLine,
    bgColor: "bg-orange-50 dark:bg-orange-950",
    color: "text-orange-600 dark:text-orange-400",
    roles: ["superviseur", "admin"],
  },
  {
    name: "revenu",
    label: "Revenu",
    description: "Analyser les revenus et la rentabilité",
    path: "/revenu",
    icon: PiggyBank,
    bgColor: "bg-teal-50 dark:bg-teal-950",
    color: "text-teal-600 dark:text-teal-400",
    roles: ["admin"],
  },
];

const getListeParRole = (userRole) => {
  if (!userRole) return [];
  return liste.filter((outil) => outil.roles.includes(userRole));
};

const MobileComptabilite = () => {
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const { user } = useActiveUserStore();

  // Filtrer les outils selon le rôle de l'utilisateur
  const liste_a_voir = useMemo(() => {
    return getListeParRole(user?.role);
  }, [user?.role]);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="p-4 pb-20 space-y-3">
        {liste_a_voir.map((outil) => {
          const Icon = outil.icon;
          return (
            <div
              key={outil.name}
              onClick={() => navigate(outil.path)}
              className="flex items-start gap-4 p-4 border rounded-lg shadow-sm hover:shadow-md transition-all hover:border-primary/50 active:scale-[0.98] cursor-pointer">
              <div className={`p-3 rounded-lg ${outil.bgColor} shrink-0`}>
                <Icon className={`w-6 h-6 ${outil.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {outil.label}
                  </h2>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {outil.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
const DesktopComptabilite = () => {
  const { isDesktop } = useBreakpoint();
  const navigate = useNavigate();
  const { user } = useActiveUserStore();
  const [visible, setVisible] = useState(false);

  // Filtrer les outils selon le rôle de l'utilisateur
  const liste_a_voir = useMemo(() => {
    return getListeParRole(user?.role);
  }, [user?.role]);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Comptabilite
          </h1>
          <p className="text-muted-foreground">
            Accédez aux différents outils de gestion de la comptabilité
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liste_a_voir.map((outil) => {
            const Icon = outil.icon;
            return (
              <Card
                key={outil.name}
                onClick={() => navigate(outil.path)}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 hover:scale-[1.02] group">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-4 rounded-xl ${outil.bgColor} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-8 h-8 ${outil.color}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">
                        {outil.label}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {outil.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    Accéder
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
const Comptabilite = () => {
  return (
    <>
      <MobileComptabilite />
      <DesktopComptabilite />
    </>
  );
};

export default Comptabilite;
