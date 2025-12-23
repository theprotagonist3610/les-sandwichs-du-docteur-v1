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
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger as TabsTriggerInner,
// } from "@/components/ui/tabs";
import taskToolkit from "@/utils/taskToolkit";
import userService from "@/services/userService";
import useActiveUserStore from "@/store/activeUserStore";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const MobileProfilActivite = () => {
  const { isMobile } = useBreakpoint();
  const { user } = useActiveUserStore();
  const [visible, setVisible] = useState(false);
  const [tachesAFaire, setTachesAFaire] = useState([]);
  const [isLoadingTaches, setIsLoadingTaches] = useState(true);
  const [journalConnexion, setJournalConnexion] = useState([]);
  const [isLoadingJournal, setIsLoadingJournal] = useState(true);
  const [tachesDisponibles, setTachesDisponibles] = useState([]);
  const [isLoadingDisponibles, setIsLoadingDisponibles] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  // États pour la création de nouvelle tâche
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("normal");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  // Charger les tâches et le journal de connexion de l'utilisateur actif
  useEffect(() => {
    if (user?.id) {
      loadUserTasks();
      loadConnectionHistory();
    }
  }, [user?.id]);

  const loadUserTasks = async () => {
    try {
      setIsLoadingTaches(true);
      const result = await taskToolkit.getTasksByUser(user.id, {
        status: ["pending", "in_progress"],
      });

      if (result.tasks) {
        setTachesAFaire(result.tasks);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tâches:", error);
    } finally {
      setIsLoadingTaches(false);
    }
  };

  const loadConnectionHistory = async () => {
    try {
      setIsLoadingJournal(true);
      const result = await userService.getConnectionHistory(user.id, 10);

      if (result.history) {
        setJournalConnexion(result.history);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique:", error);
    } finally {
      setIsLoadingJournal(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      const result = await taskToolkit.updateTask(taskId, {
        status: newStatus,
      });

      if (result.task) {
        toast.success(
          newStatus === "completed" ? "Tâche terminée" : "Tâche réactivée"
        );
        loadUserTasks();
      } else {
        toast.error("Erreur", {
          description: "Impossible de modifier la tâche",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la modification de la tâche:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const loadAvailableTasks = async () => {
    try {
      setIsLoadingDisponibles(true);
      const result = await taskToolkit.getAllTasks({
        status: ["pending", "in_progress"],
      });

      if (result.tasks) {
        // Filtrer les tâches non assignées ou assignées à d'autres
        const disponibles = result.tasks.filter(
          (task) => !task.assigned_to || task.assigned_to !== user.id
        );
        setTachesDisponibles(disponibles);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des tâches disponibles:", error);
    } finally {
      setIsLoadingDisponibles(false);
    }
  };

  const handleAssignToMe = async (taskId) => {
    try {
      const result = await taskToolkit.updateTask(taskId, {
        assignedTo: user.id,
      });

      if (result.task) {
        toast.success("Tâche assignée avec succès");
        setOpenDialog(false);
        loadUserTasks();
        loadAvailableTasks();
      } else {
        toast.error("Erreur", {
          description: "Impossible d'assigner la tâche",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'assignation de la tâche:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
    loadAvailableTasks();
  };

  const handleCreateNewTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error("Erreur", {
        description: "Le titre de la tâche est requis",
      });
      return;
    }

    try {
      const result = await taskToolkit.createTask({
        title: newTaskTitle,
        description: newTaskDescription,
        assignedTo: user.id,
        assignedBy: user.id,
        status: "pending",
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
        isRecurring: false,
      });

      if (result.task) {
        toast.success("Tâche créée et assignée avec succès");
        setOpenDialog(false);
        resetNewTaskForm();
        loadUserTasks();
      } else {
        toast.error("Erreur", {
          description: "Impossible de créer la tâche",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la création de la tâche:", error);
      toast.error("Erreur", {
        description: "Une erreur est survenue",
      });
    }
  };

  const resetNewTaskForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("normal");
    setNewTaskDueDate("");
  };

  // Border beam hook
  const { BeamComponent } = useBorderBeam({
    duration: 15,
    borderWidth: 2,
  });

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

  const parseUserAgent = (userAgent) => {
    if (!userAgent) return "Navigateur inconnu";

    // Détecter le système d'exploitation
    let os = "Système inconnu";
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac")) os = "Mac";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (
      userAgent.includes("iOS") ||
      userAgent.includes("iPhone") ||
      userAgent.includes("iPad")
    )
      os = "iOS";

    // Détecter le navigateur
    let browser = "Navigateur";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg"))
      browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
      browser = "Safari";
    else if (userAgent.includes("Edg")) browser = "Edge";

    return `${os} - ${browser}`;
  };

  const formatConnectionDate = (connectionDate) => {
    if (!connectionDate) return "Date inconnue";
    try {
      const date = parseISO(connectionDate);
      return format(date, "d MMM yyyy", { locale: fr });
    } catch {
      return "Date invalide";
    }
  };

  const formatConnectionTime = (connectionDate) => {
    if (!connectionDate) return "";
    try {
      const date = parseISO(connectionDate);
      return format(date, "HH:mm", { locale: fr });
    } catch {
      return "";
    }
  };

  const getPrioriteColor = (priorite) => {
    switch (priorite) {
      case "urgent":
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950";
      case "normal":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950";
      case "low":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950";
    }
  };

  const formatDueDate = (dueDate) => {
    if (!dueDate) return "Aucune échéance";
    try {
      const date = parseISO(dueDate);
      return format(date, "d MMMM yyyy", { locale: fr });
    } catch {
      return "Date invalide";
    }
  };

  const getPrioriteLabel = (priorite) => {
    switch (priorite) {
      case "urgent":
        return "Urgent";
      case "high":
        return "Haute";
      case "normal":
        return "Normale";
      case "low":
        return "Basse";
      default:
        return priorite;
    }
  };

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <Card className="relative overflow-hidden">
        {BeamComponent}
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Activité et Suivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="activite" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activite" className="text-xs gap-1">
                <Activity className="w-3 h-3" />
                Activité
              </TabsTrigger>
              <TabsTrigger value="journal" className="text-xs gap-1">
                <History className="w-3 h-3" />
                Journal
              </TabsTrigger>
              <TabsTrigger value="taches" className="text-xs gap-1">
                <ListTodo className="w-3 h-3" />
                Tâches
              </TabsTrigger>
            </TabsList>

            {/* Onglet Activité récente */}
            <TabsContent value="activite" className="space-y-3 mt-4">
              {activitesRecentes.map((activite) => {
                const Icon = activite.icon;
                return (
                  <div
                    key={activite.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className={`p-2 rounded-lg bg-accent/20`}>
                      <Icon className={`w-4 h-4 ${activite.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground">
                        {activite.titre}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
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
            <TabsContent value="journal" className="space-y-3 mt-4">
              {isLoadingJournal ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Chargement de l'historique...</p>
                </div>
              ) : journalConnexion.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune connexion enregistrée</p>
                </div>
              ) : (
                journalConnexion.map((connexion) => (
                  <div
                    key={connexion.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <div
                      className={`p-2 rounded-lg ${
                        connexion.success
                          ? "bg-green-50 dark:bg-green-950"
                          : "bg-red-50 dark:bg-red-950"
                      }`}>
                      <LogIn
                        className={`w-4 h-4 ${
                          connexion.success
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {connexion.success
                            ? "Connexion réussie"
                            : "Échec de connexion"}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatConnectionTime(connexion.connection_date)}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {formatConnectionDate(connexion.connection_date)}
                        </p>
                        <p>{parseUserAgent(connexion.user_agent)}</p>
                        {connexion.ip_address && (
                          <p className="text-xs">IP: {connexion.ip_address}</p>
                        )}
                        {!connexion.success && connexion.failure_reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Raison: {connexion.failure_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Onglet Tâches à faire */}
            <TabsContent value="taches" className="space-y-3 mt-4">
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleOpenDialog}
                    className="w-full mb-3"
                    size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    S'assigner une tâche
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gérer mes tâches</DialogTitle>
                    <DialogDescription>
                      Créez une nouvelle tâche ou assignez-vous une tâche
                      existante
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="create" className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="create">Créer</TabsTrigger>
                      <TabsTrigger value="assign">S'assigner</TabsTrigger>
                    </TabsList>

                    {/* Onglet Créer une nouvelle tâche */}
                    <TabsContent value="create" className="space-y-3 mt-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="new-title">Titre *</Label>
                          <Input
                            id="new-title"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Ex: Vérifier le stock"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-description">Description</Label>
                          <Textarea
                            id="new-description"
                            value={newTaskDescription}
                            onChange={(e) =>
                              setNewTaskDescription(e.target.value)
                            }
                            placeholder="Détails de la tâche..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-priority">Priorité</Label>
                          <Select
                            value={newTaskPriority}
                            onValueChange={setNewTaskPriority}>
                            <SelectTrigger id="new-priority">
                              <SelectValue />
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
                          <Label htmlFor="new-duedate">Date d'échéance</Label>
                          <Input
                            id="new-duedate"
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleCreateNewTask}
                          className="w-full"
                          size="sm">
                          Créer et m'assigner
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Onglet S'assigner une tâche existante */}
                    <TabsContent value="assign" className="space-y-3 mt-4">
                      {isLoadingDisponibles ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Chargement...</p>
                        </div>
                      ) : tachesDisponibles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Aucune tâche disponible</p>
                        </div>
                      ) : (
                        tachesDisponibles.map((tache) => (
                          <div
                            key={tache.id}
                            className="p-3 rounded-lg border border-border">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-semibold text-sm flex-1">
                                {tache.title}
                              </h4>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioriteColor(
                                  tache.priority
                                )}`}>
                                {getPrioriteLabel(tache.priority)}
                              </span>
                            </div>
                            {tache.description && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {tache.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {formatDueDate(tache.due_date)}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAssignToMe(tache.id)}
                                className="h-7 text-xs">
                                M'assigner
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>

              {isLoadingTaches ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Chargement des tâches...</p>
                </div>
              ) : tachesAFaire.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucune tâche en cours</p>
                </div>
              ) : (
                tachesAFaire.map((tache) => (
                  <div
                    key={tache.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border border-border ${
                      tache.status === "completed" ? "opacity-60" : ""
                    }`}>
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={tache.status === "completed"}
                        onChange={() =>
                          handleToggleTask(tache.id, tache.status)
                        }
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4
                          className={`font-semibold text-sm text-foreground ${
                            tache.status === "completed" ? "line-through" : ""
                          }`}>
                          {tache.title}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPrioriteColor(
                            tache.priority
                          )}`}>
                          {getPrioriteLabel(tache.priority)}
                        </span>
                      </div>
                      {tache.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {tache.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDueDate(tache.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileProfilActivite;
