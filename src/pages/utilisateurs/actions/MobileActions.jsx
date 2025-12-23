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
import taskToolkit from "@/utils/taskToolkit";
import { toast } from "sonner";
import useActiveUserStore from "@/store/activeUserStore";

const MobileActions = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const { user: currentUser } = useActiveUserStore();

  // États pour les données
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectionHistory, setConnectionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // États pour les dialogs
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isAssignTaskDialogOpen, setIsAssignTaskDialogOpen] = useState(false);

  // États pour les formulaires
  const [newRole, setNewRole] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Charger les données de l'utilisateur sélectionné
  useEffect(() => {
    if (userId) {
      loadUserData(userId);
      loadConnectionHistory(userId);
      loadTasks(userId);
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

  const loadTasks = async (id) => {
    setIsLoadingTasks(true);
    try {
      const result = await taskToolkit.getTasksByUser(id);
      if (result.tasks) {
        setTasks(result.tasks);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error);
    } finally {
      setIsLoadingTasks(false);
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

  // Gestion de l'assignation de tâche
  const handleAssignTask = async () => {
    if (!taskTitle || !selectedUser || !currentUser) {
      toast.error("Erreur", {
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    // Vérifier les permissions
    if (!taskToolkit.canAssignTask(currentUser.role, selectedUser.role, currentUser.id, selectedUser.id)) {
      toast.error("Permission refusée", {
        description: "Vous n'avez pas la permission d'assigner une tâche à cet utilisateur",
      });
      return;
    }

    try {
      const result = await taskToolkit.createTask({
        title: taskTitle,
        description: taskDescription,
        assignedTo: selectedUser.id,
        assignedBy: currentUser.id,
        priority: taskPriority,
      });

      if (result.task) {
        toast.success("Tâche assignée", {
          description: `La tâche "${taskTitle}" a été assignée avec succès`,
        });
        setIsAssignTaskDialogOpen(false);
        setTaskTitle("");
        setTaskDescription("");
        setTaskPriority("normal");
        loadTasks(selectedUser.id);
      } else {
        toast.error("Erreur", {
          description: result.error?.message || "Impossible de créer la tâche",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'assignation de la tâche:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  // Changer le statut d'une tâche
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const result = await taskToolkit.updateTask(taskId, { status: newStatus });

      if (result.task) {
        toast.success("Statut mis à jour", {
          description: "Le statut de la tâche a été modifié",
        });
        loadTasks(selectedUser.id);
      } else {
        toast.error("Erreur", {
          description: "Impossible de mettre à jour le statut",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }
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
        <CardTitle className="text-base font-semibold">
          {selectedUser
            ? `${selectedUser.prenoms} ${selectedUser.nom}`
            : "Sélectionnez un utilisateur"}
        </CardTitle>
        {selectedUser && (
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={selectedUser.is_active ? "default" : "destructive"}
              className="text-xs">
              {selectedUser.is_active ? "Actif" : "Inactif"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {formatRole(selectedUser.role)}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {!userId ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-xs">
              Sélectionnez un utilisateur dans la liste pour voir ses détails
            </p>
          </div>
        ) : (
          <Tabs defaultValue="historique" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger
                value="historique"
                className="flex items-center gap-1 text-xs">
                <History className="w-3 h-3" />
                <span className="hidden sm:inline">Historique</span>
              </TabsTrigger>
              <TabsTrigger
                value="taches"
                className="flex items-center gap-1 text-xs">
                <ListTodo className="w-3 h-3" />
                <span className="hidden sm:inline">Tâches</span>
              </TabsTrigger>
              <TabsTrigger value="gerer" className="flex items-center gap-1 text-xs">
                <Settings2 className="w-3 h-3" />
                <span className="hidden sm:inline">Gérer</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: Historique */}
            <TabsContent value="historique" className="space-y-3 mt-3">
              <div className="space-y-2">
                {isLoadingHistory ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Chargement...
                  </p>
                ) : connectionHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucun historique de connexion
                  </p>
                ) : (
                  connectionHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
                      <div>
                        <p className="text-xs font-medium">
                          Connexion depuis {entry.ip_address || "IP inconnue"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(entry.connection_date)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: Tâches */}
            <TabsContent value="taches" className="space-y-3 mt-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-medium">Liste des tâches</h3>
                <Dialog
                  open={isAssignTaskDialogOpen}
                  onOpenChange={setIsAssignTaskDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 h-8 text-xs">
                      <Plus className="w-3 h-3" />
                      Assigner
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw]">
                    <DialogHeader>
                      <DialogTitle className="text-base">
                        Assigner une tâche
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Créez une nouvelle tâche pour {selectedUser?.prenoms}{" "}
                        {selectedUser?.nom}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="task-title" className="text-xs">
                          Titre de la tâche *
                        </Label>
                        <Input
                          id="task-title"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          placeholder="Ex: Vérifier le stock"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="task-description" className="text-xs">
                          Description
                        </Label>
                        <Textarea
                          id="task-description"
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          placeholder="Détails de la tâche..."
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="task-priority" className="text-xs">
                          Priorité
                        </Label>
                        <Select value={taskPriority} onValueChange={setTaskPriority}>
                          <SelectTrigger id="task-priority" className="text-sm">
                            <SelectValue placeholder="Sélectionnez" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low" className="text-sm">
                              Basse
                            </SelectItem>
                            <SelectItem value="normal" className="text-sm">
                              Normale
                            </SelectItem>
                            <SelectItem value="high" className="text-sm">
                              Haute
                            </SelectItem>
                            <SelectItem value="urgent" className="text-sm">
                              Urgente
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAssignTaskDialogOpen(false)}
                        className="text-xs">
                        Annuler
                      </Button>
                      <Button onClick={handleAssignTask} className="text-xs">
                        Assigner
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {isLoadingTasks ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Chargement...
                  </p>
                ) : tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucune tâche assignée
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-border bg-card space-y-2">
                      {/* Header: Titre et priorité */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium flex-1">
                          {task.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 whitespace-nowrap ${
                            task.priority === "urgent"
                              ? "border-red-500 text-red-600 dark:border-red-700 dark:text-red-400"
                              : task.priority === "high"
                              ? "border-orange-500 text-orange-600 dark:border-orange-700 dark:text-orange-400"
                              : task.priority === "normal"
                              ? "border-blue-500 text-blue-600 dark:border-blue-700 dark:text-blue-400"
                              : "border-gray-500 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                          }`}>
                          {task.priority === "urgent"
                            ? "Urgente"
                            : task.priority === "high"
                            ? "Haute"
                            : task.priority === "normal"
                            ? "Normale"
                            : "Basse"}
                        </Badge>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}

                      {/* Footer: Statut et actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 ${
                            task.status === "completed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : task.status === "in_progress"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : task.status === "cancelled"
                              ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          }`}>
                          {task.status === "completed"
                            ? "Terminée"
                            : task.status === "in_progress"
                            ? "En cours"
                            : task.status === "cancelled"
                            ? "Annulée"
                            : "En attente"}
                        </Badge>

                        {/* Boutons d'action */}
                        {task.status !== "completed" &&
                          task.status !== "cancelled" && (
                            <div className="flex gap-1">
                              {task.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() =>
                                    handleTaskStatusChange(
                                      task.id,
                                      "in_progress"
                                    )
                                  }>
                                  Démarrer
                                </Button>
                              )}
                              {task.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px]"
                                  onClick={() =>
                                    handleTaskStatusChange(task.id, "completed")
                                  }>
                                  Terminer
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[10px] text-red-600 dark:text-red-400"
                                onClick={() =>
                                  handleTaskStatusChange(task.id, "cancelled")
                                }>
                                Annuler
                              </Button>
                            </div>
                          )}
                      </div>

                      {/* Métadonnées */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border">
                        <p className="text-[10px] text-muted-foreground">
                          Assigné par{" "}
                          {task.assigned_by_user?.prenoms}{" "}
                          {task.assigned_by_user?.nom}
                        </p>
                        {task.due_date && (
                          <>
                            <span className="text-[10px] text-muted-foreground">
                              •
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              Échéance: {formatDate(task.due_date)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB: Gérer */}
            <TabsContent value="gerer" className="space-y-2 mt-3">
              <div className="space-y-2">
                {/* Promotion */}
                <Dialog
                  open={isPromotionDialogOpen}
                  onOpenChange={setIsPromotionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2.5 h-auto py-2.5"
                      size="sm">
                      <ArrowUpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div className="text-left">
                        <p className="text-xs font-medium">Promotion</p>
                        <p className="text-[10px] text-muted-foreground">
                          Changer le rôle
                        </p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw]">
                    <DialogHeader>
                      <DialogTitle className="text-base">Promotion</DialogTitle>
                      <DialogDescription className="text-xs">
                        Modifier le rôle de {selectedUser?.prenoms}{" "}
                        {selectedUser?.nom}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rôle actuel</Label>
                        <p className="text-xs font-medium">
                          {formatRole(selectedUser?.role)}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="new-role" className="text-xs">
                          Nouveau rôle
                        </Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger id="new-role" className="text-sm">
                            <SelectValue placeholder="Sélectionnez un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendeur" className="text-sm">
                              Vendeur
                            </SelectItem>
                            <SelectItem value="superviseur" className="text-sm">
                              Superviseur
                            </SelectItem>
                            <SelectItem value="admin" className="text-sm">
                              Administrateur
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsPromotionDialogOpen(false)}
                        className="text-xs">
                        Annuler
                      </Button>
                      <Button onClick={handlePromotion} className="text-xs">
                        Confirmer
                      </Button>
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
                      className="w-full justify-start gap-2.5 h-auto py-2.5"
                      size="sm">
                      <PauseCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <div className="text-left">
                        <p className="text-xs font-medium">
                          {selectedUser?.is_active ? "Suspendre" : "Réactiver"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedUser?.is_active
                            ? "Désactiver le compte"
                            : "Réactiver le compte"}
                        </p>
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw]">
                    <DialogHeader>
                      <DialogTitle className="text-base">
                        {selectedUser?.is_active ? "Suspendre" : "Réactiver"} le
                        compte
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {selectedUser?.is_active
                          ? "Êtes-vous sûr de vouloir suspendre ce compte ? L'utilisateur ne pourra plus se connecter."
                          : "Êtes-vous sûr de vouloir réactiver ce compte ? L'utilisateur pourra à nouveau se connecter."}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsSuspendDialogOpen(false)}
                        className="text-xs">
                        Annuler
                      </Button>
                      <Button
                        variant={
                          selectedUser?.is_active ? "destructive" : "default"
                        }
                        onClick={handleSuspend}
                        className="text-xs">
                        {selectedUser?.is_active ? "Suspendre" : "Réactiver"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Assigner point de vente */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2.5 h-auto py-2.5"
                  size="sm"
                  disabled>
                  <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="text-xs font-medium">Assigner point de vente</p>
                    <p className="text-[10px] text-muted-foreground">
                      À implémenter
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

export default MobileActions;
