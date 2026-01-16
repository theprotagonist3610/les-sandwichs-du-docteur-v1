import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  getPendingUsers,
  approveUser,
  rejectUser,
  subscribeToPendingUsers,
} from "@/services/userApprovalService";
import useActiveUserStore from "@/store/activeUserStore";

/**
 * Composant pour gérer les approbations d'utilisateurs
 */
const UserApprovalList = () => {
  const { user } = useActiveUserStore();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Charger les utilisateurs en attente
  const loadPendingUsers = async () => {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) {
      toast.error("Erreur lors du chargement des utilisateurs");
      console.error(error);
    } else {
      setPendingUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPendingUsers();

    // S'abonner aux changements en temps réel
    const unsubscribe = subscribeToPendingUsers(() => {
      loadPendingUsers();
    });

    return () => unsubscribe();
  }, []);

  // Approuver un utilisateur
  const handleApprove = async (userId) => {
    if (!user?.id) {
      toast.error("Erreur: Utilisateur non connecté");
      return;
    }

    setProcessing(true);
    const { error } = await approveUser(userId, user.id);

    if (error) {
      toast.error("Erreur lors de l'approbation", {
        description: error.message,
      });
    } else {
      toast.success("Utilisateur approuvé avec succès", {
        description: "L'utilisateur peut maintenant se connecter",
      });
      loadPendingUsers();
    }
    setProcessing(false);
  };

  // Ouvrir la dialog de rejet
  const openRejectDialog = (user) => {
    setSelectedUser(user);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  // Rejeter un utilisateur
  const handleReject = async () => {
    if (!user?.id || !selectedUser) return;

    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer une raison pour le rejet");
      return;
    }

    setProcessing(true);
    const { error } = await rejectUser(selectedUser.id, user.id, rejectionReason);

    if (error) {
      toast.error("Erreur lors du rejet", {
        description: error.message,
      });
    } else {
      toast.success("Utilisateur rejeté", {
        description: "L'utilisateur a été informé du rejet",
      });
      setShowRejectDialog(false);
      loadPendingUsers();
    }
    setProcessing(false);
  };

  // Formater la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Utilisateurs en attente d'approbation
              </CardTitle>
              <CardDescription>
                {pendingUsers.length} utilisateur{pendingUsers.length > 1 ? "s" : ""} en attente
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {pendingUsers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun utilisateur en attente d'approbation</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Informations</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((pendingUser) => (
                  <TableRow key={pendingUser.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {pendingUser.prenoms} {pendingUser.nom}
                          </div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {pendingUser.sexe}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {pendingUser.email}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {pendingUser.telephone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(pendingUser.date_naissance).toLocaleDateString("fr-FR")}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {pendingUser.requested_role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(pendingUser.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(pendingUser.id)}
                          disabled={processing}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(pendingUser)}
                          disabled={processing}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de rejet */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande d'inscription</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de rejeter la demande de{" "}
              <strong>
                {selectedUser?.prenoms} {selectedUser?.nom}
              </strong>
              . Veuillez indiquer la raison du rejet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Raison du rejet *</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Informations incomplètes, doublon détecté, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserApprovalList;
