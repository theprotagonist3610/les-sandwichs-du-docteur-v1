import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  History,
  Clock,
  User,
  RotateCcw,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Truck,
  CheckCircle,
  Eye,
  Loader2,
} from "lucide-react";

/**
 * Section historique des modifications
 */
const CommandeHistorySection = ({
  history = [],
  historyLoading,
  hasMoreHistory,
  onLoadMore,
  onPreview,
  onRollback,
  selectedEntry,
  onClosePreview,
  showModal,
  onCloseModal,
}) => {
  // Icône selon le type d'action
  const getActionIcon = (action) => {
    const icons = {
      create: <Plus className="h-4 w-4" />,
      update: <Edit className="h-4 w-4" />,
      delete: <Trash2 className="h-4 w-4" />,
      deliver: <Truck className="h-4 w-4" />,
      close: <CheckCircle className="h-4 w-4" />,
      rollback: <RotateCcw className="h-4 w-4" />,
    };
    return icons[action] || <History className="h-4 w-4" />;
  };

  // Couleur selon le type d'action
  const getActionColor = (action) => {
    const colors = {
      create: "bg-green-500",
      update: "bg-blue-500",
      delete: "bg-red-500",
      deliver: "bg-purple-500",
      close: "bg-orange-500",
      rollback: "bg-yellow-500",
    };
    return colors[action] || "bg-gray-500";
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique des modifications
            <Badge variant="secondary">{history.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Aucun historique disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onPreview(entry)}>
                  {/* Icône action */}
                  <div
                    className={`p-2 rounded-full text-white ${getActionColor(
                      entry.action
                    )}`}>
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Détails */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.actionLabel}</span>
                      {entry.changeCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entry.changeCount} changement
                          {entry.changeCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{entry.userName}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{entry.formattedDate}</span>
                    </div>
                  </div>

                  {/* Flèche */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}

              {/* Bouton voir plus */}
              {(history.length > 5 || hasMoreHistory) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onLoadMore}
                  disabled={historyLoading}>
                  {historyLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <History className="h-4 w-4 mr-2" />
                  )}
                  Voir tout l'historique
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de prévisualisation */}
      <Dialog open={!!selectedEntry} onOpenChange={onClosePreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && getActionIcon(selectedEntry.action)}
              {selectedEntry?.actionLabel}
            </DialogTitle>
            <DialogDescription>
              Par {selectedEntry?.userName} le {selectedEntry?.formattedDate}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry?.changes && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              <h4 className="font-medium text-sm">Modifications:</h4>
              {Object.entries(selectedEntry.changes).map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <p className="font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  {value.from !== undefined && (
                    <p className="text-red-600 line-through">
                      Avant: {JSON.stringify(value.from)}
                    </p>
                  )}
                  {value.to !== undefined && (
                    <p className="text-green-600">
                      Après: {JSON.stringify(value.to)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClosePreview}>
              Fermer
            </Button>
            {selectedEntry?.snapshot && (
              <Button
                variant="default"
                onClick={() => onRollback(selectedEntry)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurer cette version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal historique complet */}
      <Dialog open={showModal} onOpenChange={onCloseModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Historique complet</DialogTitle>
            <DialogDescription>
              Toutes les modifications apportées à cette commande
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {history.map((entry, index) => (
                <div
                  key={entry.id || index}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`p-2 rounded-full text-white ${getActionColor(
                        entry.action
                      )}`}>
                      {getActionIcon(entry.action)}
                    </div>
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.actionLabel}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreview(entry)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {entry.snapshot && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRollback(entry)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <User className="h-3 w-3" />
                      <span>{entry.userName}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{entry.formattedDate}</span>
                    </div>
                    {entry.changeCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.changeCount} champ
                        {entry.changeCount > 1 ? "s" : ""} modifié
                        {entry.changeCount > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {hasMoreHistory && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onLoadMore}
                  disabled={historyLoading}>
                  {historyLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    "Charger plus"
                  )}
                </Button>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CommandeHistorySection;
