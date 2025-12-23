import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Calendar, Trash2, RefreshCw, Pencil } from "lucide-react";
import taskToolkit from "@/utils/taskToolkit";
import userService from "@/services/userService";
import useActiveUserStore from "@/store/activeUserStore";
import { toast } from "sonner";
import WithPermission from "@/components/auth/WithPermission";

const TachesRecurrentes = () => {
  const { user: currentUser } = useActiveUserStore();
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // États du formulaire
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [recurrencePattern, setRecurrencePattern] = useState("daily");

  useEffect(() => {
    loadRecurringTasks();
    loadUsers();
  }, []);

  const loadRecurringTasks = async () => {
    setIsLoading(true);
    try {
      const result = await taskToolkit.getRecurringTasks();
      if (result.tasks) {
        setRecurringTasks(result.tasks);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tâches récurrentes:", error);
      toast.error("Erreur", {
        description: "Impossible de charger les tâches récurrentes",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await userService.getAllUsers();
      if (result.users) {
        setUsers(result.users.filter((u) => u.is_active));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };

  const handleCreateRecurringTask = async () => {
    if (!taskTitle || !assignedTo || !currentUser) {
      toast.error("Erreur", {
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    try {
      const result = await taskToolkit.createTask({
        title: taskTitle,
        description: taskDescription,
        assignedTo: assignedTo,
        assignedBy: currentUser.id,
        priority: taskPriority,
        isRecurring: true,
        recurrencePattern: recurrencePattern,
      });

      if (result.task) {
        toast.success("Tâche récurrente créée", {
          description: `La tâche "${taskTitle}" sera créée automatiquement chaque jour`,
        });
        setIsCreateDialogOpen(false);
        resetForm();
        loadRecurringTasks();
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de créer la tâche récurrente",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création de la tâche récurrente:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const handleDeleteRecurringTask = async (taskId) => {
    try {
      const result = await taskToolkit.deleteTask(taskId);
      if (!result.error) {
        toast.success("Tâche récurrente supprimée", {
          description: "La tâche récurrente a été supprimée avec succès",
        });
        loadRecurringTasks();
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de supprimer la tâche",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const handleGenerateDailyTasks = async () => {
    try {
      const result = await taskToolkit.createDailyTasks();
      if (!result.error) {
        toast.success("Tâches générées", {
          description: "Les tâches quotidiennes ont été créées avec succès",
        });
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de générer les tâches",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la génération des tâches:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskPriority(task.priority);
    setAssignedTo(task.assigned_to);
    setRecurrencePattern(task.recurrence_pattern);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!taskTitle || !assignedTo || !editingTask) {
      toast.error("Erreur", {
        description: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    try {
      const result = await taskToolkit.updateTask(editingTask.id, {
        title: taskTitle,
        description: taskDescription,
        assignedTo: assignedTo,
        priority: taskPriority,
        recurrencePattern: recurrencePattern,
      });

      if (result.task) {
        toast.success("Template modifié", {
          description: `Le template "${taskTitle}" a été mis à jour`,
        });
        setIsEditDialogOpen(false);
        resetForm();
        setEditingTask(null);
        loadRecurringTasks();
      } else {
        toast.error("Erreur", {
          description:
            result.error?.message || "Impossible de modifier le template",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la modification:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const resetForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("normal");
    setAssignedTo("");
    setRecurrencePattern("daily");
    setEditingTask(null);
  };

  const formatRole = (role) => {
    const roles = {
      admin: "Admin",
      superviseur: "Superviseur",
      vendeur: "Vendeur",
    };
    return roles[role] || role;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* En-tête */}
      <div className="mb-6 md:mb-10">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">
              Tâches récurrentes
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gérez les tâches qui seront créées automatiquement chaque jour
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleGenerateDailyTasks}
              className="gap-2">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Générer maintenant</span>
            </Button>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nouvelle tâche</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer une tâche récurrente</DialogTitle>
                  <DialogDescription>
                    Cette tâche sera créée automatiquement chaque jour
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="Ex: Vérifier le stock du matin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Détails de la tâche..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assigned-to">Assigner à *</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger id="assigned-to">
                        <SelectValue placeholder="Sélectionnez un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.prenoms} {user.nom} ({formatRole(user.role)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priorité</Label>
                    <Select
                      value={taskPriority}
                      onValueChange={setTaskPriority}>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Sélectionnez la priorité" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Basse</SelectItem>
                        <SelectItem value="normal">Normale</SelectItem>
                        <SelectItem value="high">Haute</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recurrence">Récurrence</Label>
                    <Select
                      value={recurrencePattern}
                      onValueChange={setRecurrencePattern}>
                      <SelectTrigger id="recurrence">
                        <SelectValue placeholder="Sélectionnez la récurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Quotidienne</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      resetForm();
                    }}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreateRecurringTask}>Créer</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le template</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de cette tâche récurrente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre *</Label>
              <Input
                id="edit-title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ex: Vérifier le stock du matin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Détails de la tâche..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assigned-to">Assigner à *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger id="edit-assigned-to">
                  <SelectValue placeholder="Sélectionnez un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.prenoms} {user.nom} ({formatRole(user.role)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priorité</Label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger id="edit-priority">
                  <SelectValue placeholder="Sélectionnez la priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-recurrence">Récurrence</Label>
              <Select
                value={recurrencePattern}
                onValueChange={setRecurrencePattern}>
                <SelectTrigger id="edit-recurrence">
                  <SelectValue placeholder="Sélectionnez la récurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}>
              Annuler
            </Button>
            <Button onClick={handleUpdateTask}>Modifier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liste des tâches récurrentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Templates de tâches
            <Badge variant="outline" className="ml-auto">
              {recurringTasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : recurringTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune tâche récurrente</p>
              <p className="text-xs mt-1">
                Créez votre première tâche récurrente pour automatiser votre
                workflow
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <h3 className="text-sm font-medium">{task.title}</h3>
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${
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

                      {task.description && (
                        <p className="text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Assigné à: {task.assigned_to_user?.prenoms}{" "}
                          {task.assigned_to_user?.nom}
                        </span>
                        <span>•</span>
                        <span>
                          {task.recurrence_pattern === "daily"
                            ? "Quotidienne"
                            : task.recurrence_pattern === "weekly"
                            ? "Hebdomadaire"
                            : "Mensuelle"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecurringTask(task.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Comment ça fonctionne ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Les tâches récurrentes sont des templates qui seront automatiquement
            créées chaque jour.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              Les tâches quotidiennes sont générées automatiquement à minuit
            </li>
            <li>Chaque tâche générée est liée à son template parent</li>
            <li>
              Vous pouvez générer manuellement les tâches du jour en cliquant
              sur "Générer maintenant"
            </li>
            <li>
              Les templates peuvent être modifiés ou supprimés à tout moment
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Protéger la page - accessible uniquement aux admins
export default WithPermission(
  TachesRecurrentes,
  (userRole) => userRole === "admin",
  "/"
);
