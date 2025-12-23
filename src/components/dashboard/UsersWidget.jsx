import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  TrendingDown,
  UserCog,
  Plus,
  ArrowRight,
  Dot,
} from "lucide-react";
import {
  getAllUsers,
  getUserStats,
  getPreUsers,
  isUserOnline,
} from "@/services/userService";
import { toast } from "sonner";

const UsersWidget = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [preUsers, setPreUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);

    // Charger les utilisateurs
    const { users: usersData, error: usersError } = await getAllUsers();
    if (usersError) {
      toast.error("Erreur", {
        description: "Impossible de charger les utilisateurs",
      });
    } else {
      setUsers(usersData);
    }

    // Charger les pré-utilisateurs
    const { preUsers: preUsersData, error: preUsersError } =
      await getPreUsers();
    if (!preUsersError && preUsersData) {
      setPreUsers(preUsersData);
    }

    // Charger les statistiques par rôle
    const { stats: statsData, error: statsError } = await getUserStats();
    if (!statsError && statsData) {
      setStats(statsData);
    }

    setIsLoading(false);
  };

  // Calculer les statistiques
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const inactiveUsers = users.filter((u) => !u.is_active).length;
  const vendeurs = users.filter((u) => u.role === "vendeur").length;
  const superviseurs = users.filter((u) => u.role === "superviseur").length;
  const admins = users.filter((u) => u.role === "admin").length;
  const onlineUsers = users.filter((u) => isUserOnline(u.last_seen));

  // Calculer la variation (exemple: +5% ce mois)
  // TODO: Implémenter la logique de comparaison avec le mois précédent
  const variation = 5.2; // Mock data

  const statsCards = [
    {
      title: "Total Utilisateurs",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      trend: variation,
    },
    {
      title: "Actifs",
      value: activeUsers,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950",
      percentage:
        totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0,
    },
    {
      title: "Inactifs",
      value: inactiveUsers,
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950",
      percentage:
        totalUsers > 0 ? ((inactiveUsers / totalUsers) * 100).toFixed(1) : 0,
    },
    {
      title: "Pré-utilisateurs",
      value: preUsers.length,
      icon: UserCog,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      description: "En attente d'activation",
    },
  ];

  const roleCards = [
    {
      title: "Vendeurs",
      value: vendeurs,
      color: "text-orange-600 dark:text-orange-400",
      percentage:
        totalUsers > 0 ? ((vendeurs / totalUsers) * 100).toFixed(1) : 0,
    },
    {
      title: "Superviseurs",
      value: superviseurs,
      color: "text-cyan-600 dark:text-cyan-400",
      percentage:
        totalUsers > 0 ? ((superviseurs / totalUsers) * 100).toFixed(1) : 0,
    },
    {
      title: "Admins",
      value: admins,
      color: "text-indigo-600 dark:text-indigo-400",
      percentage: totalUsers > 0 ? ((admins / totalUsers) * 100).toFixed(1) : 0,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-3 bg-muted rounded w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec actions rapides */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className={`font-bold text-foreground ${
              isMobile ? "text-lg" : "text-xl"
            }`}>
            Utilisateurs
          </h2>
          <p
            className={`text-muted-foreground ${
              isMobile ? "text-xs" : "text-sm"
            }`}>
            Vue d'ensemble des utilisateurs de la plateforme
          </p>
        </div>
        <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
          <Button
            size={isMobile ? "sm" : "default"}
            onClick={() => navigate("/utilisateurs")}
            className="gap-2">
            <Plus className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            Ajouter
          </Button>
          <Button
            size={isMobile ? "sm" : "default"}
            variant="outline"
            onClick={() => navigate("/utilisateurs")}
            className="gap-2">
            Voir tout
            <ArrowRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </Button>
        </div>
      </div>

      {/* Statistiques de connexion */}
      <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className={isMobile ? "px-4 py-3" : "py-4"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Dot className="w-8 h-8 text-green-500 animate-pulse absolute -left-1 -top-1" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
              </div>
              <div>
                <p
                  className={`font-semibold text-foreground ${
                    isMobile ? "text-base" : "text-lg"
                  }`}>
                  {onlineUsers.length}{" "}
                  {onlineUsers.length > 1 ? "utilisateurs" : "utilisateur"} en
                  ligne
                </p>
                <p
                  className={`text-muted-foreground ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}>
                  Connectés maintenant
                </p>
              </div>
            </div>
            <Button
              size={isMobile ? "sm" : "default"}
              variant="ghost"
              onClick={() => navigate("/utilisateurs")}
              className="gap-2">
              Voir présence
              <ArrowRight className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cartes de statistiques principales */}
      <div
        className={`grid ${
          isMobile ? "grid-cols-2 gap-3" : "grid-cols-2 lg:grid-cols-4 gap-4"
        }`}>
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow cursor-pointer border-border">
              <CardHeader className={isMobile ? "pb-2 px-3 pt-3" : "pb-2"}>
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={`${
                      isMobile ? "text-xs" : "text-sm"
                    } font-medium text-muted-foreground`}>
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon
                      className={`${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} ${
                        stat.color
                      }`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className={isMobile ? "px-3 pb-3" : ""}>
                <div
                  className={`${
                    isMobile ? "text-xl" : "text-2xl"
                  } font-bold text-foreground`}>
                  {stat.value}
                </div>
                {stat.percentage && (
                  <p
                    className={`${
                      isMobile ? "text-[10px]" : "text-xs"
                    } text-muted-foreground mt-1`}>
                    {stat.percentage}% du total
                  </p>
                )}
                {stat.description && (
                  <p
                    className={`${
                      isMobile ? "text-[10px]" : "text-xs"
                    } text-muted-foreground mt-1`}>
                    {stat.description}
                  </p>
                )}
                {stat.trend !== undefined && (
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      isMobile ? "text-[10px]" : "text-xs"
                    }`}>
                    {stat.trend > 0 ? (
                      <>
                        <TrendingUp
                          className={`${
                            isMobile ? "w-3 h-3" : "w-3.5 h-3.5"
                          } text-green-600`}
                        />
                        <span className="text-green-600 font-medium">
                          +{stat.trend}%
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown
                          className={`${
                            isMobile ? "w-3 h-3" : "w-3.5 h-3.5"
                          } text-red-600`}
                        />
                        <span className="text-red-600 font-medium">
                          {stat.trend}%
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">ce mois</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cartes de répartition par rôle */}
      <Card>
        <CardHeader className={isMobile ? "px-4 py-3" : ""}>
          <CardTitle className={isMobile ? "text-sm" : "text-base"}>
            Répartition par Rôle
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div
            className={`grid ${
              isMobile ? "grid-cols-3 gap-3" : "grid-cols-3 gap-6"
            }`}>
            {roleCards.map((role, index) => (
              <div key={index} className="text-center">
                <div
                  className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold ${
                    role.color
                  }`}>
                  {role.value}
                </div>
                <div
                  className={`${
                    isMobile ? "text-xs" : "text-sm"
                  } text-muted-foreground mt-1`}>
                  {role.title}
                </div>
                <div
                  className={`${
                    isMobile ? "text-[10px]" : "text-xs"
                  } font-medium text-foreground mt-0.5`}>
                  {role.percentage}%
                </div>
                {/* Barre de progression */}
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300`}
                    style={{
                      width: `${role.percentage}%`,
                      backgroundColor: `hsl(var(--${
                        role.color.includes("orange")
                          ? "chart-1"
                          : role.color.includes("cyan")
                          ? "chart-3"
                          : "chart-4"
                      }))`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersWidget;
