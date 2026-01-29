import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  UserX,
  UserCog,
  ArrowRight,
  Dot,
} from "lucide-react";
import {
  getAllUsers,
  getUserStats,
  isUserOnline,
} from "@/services/userService";
import { toast } from "sonner";

const UsersWidget = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
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
  const onlineUsers = users.filter((u) => isUserOnline(u.last_login_at));

  const statsCards = [
    {
      title: "Total",
      value: totalUsers,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Actifs",
      value: activeUsers,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Inactifs",
      value: inactiveUsers,
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
    },
    {
      title: "En ligne",
      value: onlineUsers.length,
      icon: UserCog,
      color: "text-green-500 dark:text-green-400",
    },
  ];

  const roleCards = [
    {
      title: "Vendeurs",
      value: vendeurs,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500",
    },
    {
      title: "Superviseurs",
      value: superviseurs,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-500",
    },
    {
      title: "Admins",
      value: admins,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500",
    },
  ];

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className={isMobile ? "px-3 py-2" : "px-4 py-3"}>
          <div className="h-4 bg-muted rounded w-24" />
        </CardHeader>
        <CardContent className={isMobile ? "px-3 pb-3" : "px-4 pb-4"}>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={isMobile ? "px-3 py-2" : "px-4 py-3"}>
        <div className="flex items-center justify-between">
          <CardTitle className={isMobile ? "text-sm" : "text-base"}>
            Utilisateurs
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/utilisateurs")}
            className="gap-1 h-7 text-xs">
            Tout
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "px-3 pb-3 space-y-2.5" : "px-4 pb-4 space-y-3"}>
        {/* Indicateur en ligne - version ultra compacte */}
        <div className="flex items-center gap-2 p-2 bg-green-50/50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-900">
          <div className="relative">
            <Dot className="w-5 h-5 text-green-500 animate-pulse absolute -left-0.5 -top-0.5" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          </div>
          <span className={`font-semibold text-foreground ${isMobile ? "text-xs" : "text-sm"}`}>
            {onlineUsers.length} en ligne
          </span>
        </div>

        {/* Grille de statistiques - version compacte */}
        <div className="grid grid-cols-4 gap-2">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="text-center p-2 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                <Icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                <div className={`font-bold text-foreground ${isMobile ? "text-base" : "text-lg"}`}>
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {stat.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Répartition par rôle - version compacte */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Par rôle
          </p>
          <div className="grid grid-cols-3 gap-2">
            {roleCards.map((role, index) => (
              <div key={index} className="text-center p-2 rounded-lg bg-muted/30 border border-border">
                <div className={`${isMobile ? "text-lg" : "text-xl"} font-bold ${role.color}`}>
                  {role.value}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {role.title}
                </div>
                {/* Mini barre de progression */}
                <div className="w-full bg-muted rounded-full h-1 mt-1.5">
                  <div
                    className={`h-1 rounded-full ${role.bgColor}`}
                    style={{
                      width: `${totalUsers > 0 ? (role.value / totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersWidget;
