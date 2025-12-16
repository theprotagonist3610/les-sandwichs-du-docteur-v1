import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBorderBeam } from "@/hooks/useBorderBeam";
import {
  Activity,
  Clock,
  CheckCircle2,
  Calendar,
  History,
  ListTodo,
  ShoppingCart,
  LogIn,
} from "lucide-react";

const DesktopProfilActivite = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Données d'activité récente temporaires
  const activitesRecentes = [
    {
      id: 1,
      type: "commande",
      titre: "Commande #1234 traitée",
      description: "Sandwich Végétarien + Boisson",
      heure: "Il y a 15 min",
      icon: ShoppingCart,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      id: 2,
      type: "commande",
      titre: "Commande #1233 livrée",
      description: "Menu complet pour 2 personnes",
      heure: "Il y a 1h",
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    },
    {
      id: 3,
      type: "tache",
      titre: "Inventaire mis à jour",
      description: "Stock de pain mis à jour",
      heure: "Il y a 2h",
      icon: ListTodo,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  // Journal de connexion temporaire
  const journalConnexion = [
    {
      id: 1,
      date: "14/12/2025",
      heure: "14:30",
      appareil: "Windows - Chrome",
      ip: "192.168.1.1",
    },
    {
      id: 2,
      date: "14/12/2025",
      heure: "09:15",
      appareil: "Windows - Chrome",
      ip: "192.168.1.1",
    },
    {
      id: 3,
      date: "13/12/2025",
      heure: "15:45",
      appareil: "Android - Chrome Mobile",
      ip: "192.168.1.50",
    },
  ];

  // Tâches à faire temporaires
  const tachesAFaire = [
    {
      id: 1,
      titre: "Vérifier le stock de légumes",
      priorite: "haute",
      echeance: "Aujourd'hui",
      completed: false,
    },
    {
      id: 2,
      titre: "Préparer le rapport hebdomadaire",
      priorite: "moyenne",
      echeance: "Demain",
      completed: false,
    },
    {
      id: 3,
      titre: "Commander des emballages",
      priorite: "basse",
      echeance: "Cette semaine",
      completed: true,
    },
  ];

  const getPrioriteColor = (priorite) => {
    switch (priorite) {
      case "haute":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950";
      case "moyenne":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950";
      case "basse":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950";
    }
  };

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <Card className="relative overflow-hidden h-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Activité et Suivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="activite" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activite" className="gap-2">
                <Activity className="w-4 h-4" />
                Activité récente
              </TabsTrigger>
              <TabsTrigger value="journal" className="gap-2">
                <History className="w-4 h-4" />
                Journal de connexion
              </TabsTrigger>
              <TabsTrigger value="taches" className="gap-2">
                <ListTodo className="w-4 h-4" />
                Tâches à faire
              </TabsTrigger>
            </TabsList>

            {/* Onglet Activité récente */}
            <TabsContent value="activite" className="space-y-4 mt-6">
              {activitesRecentes.map((activite) => {
                const Icon = activite.icon;
                return (
                  <div
                    key={activite.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg bg-accent/20`}>
                      <Icon className={`w-5 h-5 ${activite.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground">
                        {activite.titre}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activite.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {activite.heure}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Onglet Journal de connexion */}
            <TabsContent value="journal" className="space-y-4 mt-6">
              {journalConnexion.map((connexion) => (
                <div
                  key={connexion.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <LogIn className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">
                        Connexion réussie
                      </h4>
                      <span className="text-sm text-muted-foreground">
                        {connexion.heure}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {connexion.date}
                      </p>
                      <p>{connexion.appareil}</p>
                      <p className="text-xs">IP: {connexion.ip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Onglet Tâches à faire */}
            <TabsContent value="taches" className="space-y-4 mt-6">
              {tachesAFaire.map((tache) => (
                <div
                  key={tache.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border border-border ${
                    tache.completed ? "opacity-60" : ""
                  }`}
                >
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={tache.completed}
                      readOnly
                      className="w-5 h-5 rounded border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4
                        className={`font-semibold text-foreground ${
                          tache.completed ? "line-through" : ""
                        }`}
                      >
                        {tache.titre}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getPrioriteColor(
                          tache.priorite
                        )}`}
                      >
                        {tache.priorite}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {tache.echeance}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesktopProfilActivite;
