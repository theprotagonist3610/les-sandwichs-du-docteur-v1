import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  ListTodo,
  Settings2,
  Plus,
  ArrowUpCircle,
  PauseCircle,
  MapPin,
} from "lucide-react";
import userService from "@/services/userService";
import { toast } from "sonner";

const DesktopActions = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");

  // États pour les données
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // États pour les dialogs
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);

  // États pour les formulaires
  const [newRole, setNewRole] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  // Charger les données de l'utilisateur sélectionné
  useEffect(() => {
    if (userId) {
      loadUserData(userId);
      loadConnectionHistory(userId);
    }
  }, [userId]);

  const loadUserData = async (id) => {
    try {
      const result = await userService.getUserById(id);
      if (result.user) {
        setSelectedUser(result.user);
        setNewRole(result.user.role);
      } else {
        toast.error("Erreur", {
          description: "Impossible de charger les informations de l'utilisateur",
        });
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'utilisateur:", error);
    }
  };

  const loadConnectionHistory = async (id) => {
    setIsLoadingHistory(true);
    try {
      const result = await userService.getConnectionHistory(id, 20);
      if (result.history) {
        setConnectionHistory(result.history);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Gestion de la promotion (changement de rôle)
  const handlePromotion = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const result = await userService.updateUser(selectedUser.id, {
        role: newRole,
      });

      if (result.user) {
        toast.success("Promotion effectuée", {
          description: `Le rôle a été changé en ${newRole}`,
        });
        setSelectedUser(result.user);
        setIsPromotionDialogOpen(false);
      } else {
        toast.error("Erreur", {
          description: result.error?.message || "Impossible de changer le rôle",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la promotion:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  // Gestion de la suspension
  const handleSuspend = async () => {
    if (!selectedUser) return;

    try {
      const result = selectedUser.is_active
        ? await userService.deactivateUser(selectedUser.id)
        : await userService.activateUser(selectedUser.id);

      if (!result.error) {
        const action = selectedUser.is_active ? "suspendu" : "réactivé";
        toast.success(`Compte ${action}`, {
          description: `Le compte a été ${action} avec succès`,
        });
        loadUserData(selectedUser.id);
        setIsSuspendDialogOpen(false);
      } else {
        toast.error("Erreur", {
          description: result.error?.message || "Impossible de modifier le compte",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suspension:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  // Gestion de l'assignation de tâche (à implémenter avec la table tasks)
  const handleAssignTask = () => {
    toast.info("Fonction à implémenter", {
      description: "L'assignation de tâches sera implémentée prochainement",
    });
    setIsAssignTaskDialogOpen(false);
    setTaskTitle("");
    setTaskDescription("");
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Formater le rôle
  const formatRole = (role) => {
    const roles = {
      admin: "Administrateur",
      superviseur: "Superviseur",
      vendeur: "Vendeur",
    };
    return roles[role] || role;
  };

  if (!visible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {selectedUser
            ? `${selectedUser.prenoms} ${selectedUser.nom}`
            : "Sélectionnez un utilisateur"}
        </CardTitle>
        {selectedUser && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={selectedUser.is_active ? "default" : "destructive"}>
              {selectedUser.is_active ? "Actif" : "Inactif"}
            </Badge>
            <Badge variant="outline">{formatRole(selectedUser.role)}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!userId ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">
              Sélectionnez un utilisateur dans la liste pour voir ses détails
            </p>
          </div>
        ) : (
          <Tabs defaultValue="historique" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="historique" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Historique</span>
              </TabsTrigger>
              <TabsTrigger value="taches" className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                <span>Tâches</span>
              </TabsTrigger>
              <TabsTrigger value="gerer" className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                <span>Gérer</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Historique */}
            <TabsContent value="historique" className="space-y-4 mt-4">
              <div className="space-y-2">
                {isLoadingHistory ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chargement...
                  </p>
                ) : connectionHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Aucun historique de connexion
                  </p>
                ) : (
                  connectionHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">
                          Connexion depuis {entry.ip_address || "IP inconnue"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.connection_date)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: Tâches */}
            <TabsContent value="taches" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Liste des tâches</h3>
                <Dialog
                  open={isAssignTaskDialogOpen}
                  onOpenChange={setIsAssignTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Assigner tâche
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assigner une tâche</DialogTitle>
                      <DialogDescription>
                        Créez une nouvelle tâche pour{" "}
                        {selectedUser?.prenoms} {selectedUser?.nom}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="task-title">Titre de la tâche</Label>
                        <Input
                          id="task-title"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="Ex: Vérifier le stock"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="task-description">Description</Label>
                        <Textarea
                          id="task-description"
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="Détails de la tâche..."
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAssignTaskDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAssignTask}>Assigner</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucune tâche assignée
                </p>
              </div>
            </TabsContent>

            {/* TAB: Gérer */}
            <TabsContent value="gerer" className="space-y-4 mt-4">
              <div className="space-y-3">
                {/* Promotion */}
                <Dialog
                  open={isPromotionDialogOpen}
                  onOpenChange={setIsPromotionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      size="lg">
                      <ArrowUpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className="text-left">
                        <p className="font-medium">Promotion</p>
                        <p className="text-xs text-muted-foreground">
                          Changer le rôle de l'utilisateur
                        </p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Promotion</DialogTitle>
                      <DialogDescription>
                        Modifier le rôle de {selectedUser?.prenoms}{" "}
                        {selectedUser?.nom}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Rôle actuel</Label>
                        <p className="text-sm font-medium">
                          {formatRole(selectedUser?.role)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-role">Nouveau rôle</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger id="new-role">
                            <SelectValue placeholder="Sélectionnez un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendeur">Vendeur</SelectItem>
                            <SelectItem value="superviseur">Superviseur</SelectItem>
                            <SelectItem value="admin">Administrateur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsPromotionDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handlePromotion}>Confirmer</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Suspendre/Réactiver */}
                <Dialog
                  open={isSuspendDialogOpen}
                  onOpenChange={setIsSuspendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      size="lg">
                      <PauseCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <div className="text-left">
                        <p className="font-medium">
                          {selectedUser?.is_active ? "Suspendre" : "Réactiver"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedUser?.is_active
                            ? "Désactiver le compte utilisateur"
                            : "Réactiver le compte utilisateur"}
                        </p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedUser?.is_active ? "Suspendre" : "Réactiver"} le
                        compte
                      </DialogTitle>
                      <DialogDescription>
                        {selectedUser?.is_active
                          ? "Êtes-vous sûr de vouloir suspendre ce compte ? L'utilisateur ne pourra plus se connecter."
                          : "Êtes-vous sûr de vouloir réactiver ce compte ? L'utilisateur pourra à nouveau se connecter."}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsSuspendDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button
                        variant={selectedUser?.is_active ? "destructive" : "default"}
                        onClick={handleSuspend}>
                        {selectedUser?.is_active ? "Suspendre" : "Réactiver"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Assigner point de vente */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  size="lg"
                  disabled>
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="font-medium">Assigner point de vente</p>
                    <p className="text-xs text-muted-foreground">
                      À implémenter prochainement
                    </p>
                  </div>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default DesktopActions;
