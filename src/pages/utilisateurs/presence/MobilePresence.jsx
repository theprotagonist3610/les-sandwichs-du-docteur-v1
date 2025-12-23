import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  UserCog,
  User as UserIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import userService from "@/services/userService";
import { toast } from "sonner";
import { supabase } from "@/config/supabase";

const MobilePresence = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [preUsers, setPreUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Charger les utilisateurs et pré-utilisateurs
  useEffect(() => {
    loadUsersAndPreUsers();
  }, []);

  // Subscription Realtime pour les mises à jour de users
  useEffect(() => {
    const channel = supabase
      .channel("users-presence-changes-mobile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          // Recharger la liste lors de changements
          loadUsersAndPreUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsersAndPreUsers = async () => {
    setIsLoading(true);
    try {
      // Charger les utilisateurs
      const usersResult = await userService.getAllUsers();
      if (usersResult.users) {
        setUsers(usersResult.users);
      }

      // Charger les pré-utilisateurs
      const preUsersResult = await userService.getPreUsers();
      if (preUsersResult.preUsers) {
        setPreUsers(preUsersResult.preUsers);
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer les utilisateurs actifs et inactifs
  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  // Icône selon le rôle
  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "superviseur":
        return <UserCog className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "vendeur":
        return <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Formater le rôle
  const formatRole = (role) => {
    const roles = {
      admin: "Admin",
      superviseur: "Superviseur",
      vendeur: "Vendeur",
    };
    return roles[role] || role;
  };

  // Navigation vers la page de détail
  const handleUserClick = (userId) => {
    navigate(`/utilisateurs?id=${userId}`);
  };

  if (!visible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          Présence
          <Badge variant="outline" className="ml-auto text-xs">
            {users.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Chargement...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Aucun utilisateur
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["actifs", "inactifs"]}>
            {/* Utilisateurs Actifs */}
            <AccordionItem value="actifs">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">Actifs</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {activeUsers.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pt-1">
                  {activeUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Aucun utilisateur actif
                    </p>
                  ) : (
                    activeUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleUserClick(user.id)}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors">
                        {/* Avatar avec indicateur de présence */}
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.photo_url} alt="Avatar" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {user.prenoms?.charAt(0)}
                              {user.nom?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Pastille verte si en ligne */}
                          {userService.isUserOnline(user.last_seen) && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                          )}
                        </div>

                        {/* Nom et prénom */}
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.prenoms} {user.nom}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {formatRole(user.role)}
                          </p>
                        </div>

                        {/* Icône rôle */}
                        <div className="flex-shrink-0">
                          {getRoleIcon(user.role)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Utilisateurs Inactifs et Pré-utilisateurs */}
            <AccordionItem value="inactifs">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium">Inactifs</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {inactiveUsers.length + preUsers.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 pt-1">
                  {inactiveUsers.length === 0 && preUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Aucun utilisateur inactif
                    </p>
                  ) : (
                    <>
                      {/* Pré-utilisateurs (en attente) */}
                      {preUsers.map((preUser) => (
                        <div
                          key={`pre-${preUser.id}`}
                          className="w-full flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                          {/* Avatar */}
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold">
                              {preUser.prenoms?.charAt(0)}
                              {preUser.nom?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Nom et prénom */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground truncate">
                                {preUser.prenoms} {preUser.nom}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1 py-0 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400 whitespace-nowrap">
                                En attente
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatRole(preUser.role)}
                            </p>
                          </div>

                          {/* Icône rôle */}
                          <div className="flex-shrink-0">
                            {getRoleIcon(preUser.role)}
                          </div>
                        </div>
                      ))}

                      {/* Utilisateurs inactifs */}
                      {inactiveUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserClick(user.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors opacity-60">
                          {/* Avatar */}
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.photo_url} alt="Avatar" />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {user.prenoms?.charAt(0)}
                              {user.nom?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Nom et prénom */}
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {user.prenoms} {user.nom}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatRole(user.role)}
                            </p>
                          </div>

                          {/* Icône rôle */}
                          <div className="flex-shrink-0">
                            {getRoleIcon(user.role)}
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default MobilePresence;
