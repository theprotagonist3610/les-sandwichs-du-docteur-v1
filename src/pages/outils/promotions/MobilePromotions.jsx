import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import PromotionTemplateCard from "@/components/promotions/PromotionTemplateCard";
import PromotionInstanceCard from "@/components/promotions/PromotionInstanceCard";
import ActivationDialog from "@/components/promotions/ActivationDialog";
import PromotionStats from "@/components/promotions/PromotionStats";

/**
 * Vue mobile des promotions
 * Reçoit les données et handlers via props depuis le composant parent
 */
const MobilePromotions = ({
  // Templates
  templates,
  loadingTemplates,
  handleActivate,
  handleDeleteTemplate,
  handleSearchTemplates,

  // Instances
  instances,
  stats,
  loadingInstances,
  handlePause,
  handleResume,
  handleCancel,
  handleComplete,
  handleSearchInstances,
}) => {
  // États locaux UI uniquement
  const [activeTab, setActiveTab] = useState("instances");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Gestion de la recherche
  const handleSearch = () => {
    if (activeTab === "templates") {
      handleSearchTemplates(searchTerm);
    } else {
      handleSearchInstances(searchTerm, filterStatus);
    }
  };

  // Filtrer les instances selon le statut
  const filteredInstances = instances.filter((instance) => {
    if (filterStatus === "all") return true;
    return instance.status === filterStatus;
  });

  // Ouvrir le dialog d'activation
  const openActivationDialog = (template) => {
    setSelectedTemplate(template);
    setShowActivationDialog(true);
  };

  // Activer un template
  const handleTemplateActivation = async (templateId, activationData) => {
    const result = await handleActivate(templateId, activationData);
    if (result.success) {
      setShowActivationDialog(false);
      setSelectedTemplate(null);
      setActiveTab("instances");
    }
  };

  return (
    <div className="min-h-screen space-y-4 p-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
            <p className="text-sm text-muted-foreground">Gérez vos promotions</p>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowSearch(!showSearch)}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Barre de recherche (collapsible) */}
        {showSearch && (
          <div className="space-y-2 animate-in slide-in-from-top-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            {activeTab === "instances" && (
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="completed">Terminées</SelectItem>
                  <SelectItem value="cancelled">Annulées</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleSearch} className="w-full">
              <Search className="mr-2 h-4 w-4" />
              Rechercher
            </Button>
          </div>
        )}
      </div>

      {/* Statistiques (version compacte) */}
      <PromotionStats stats={stats} />

      {/* Tabs: Templates vs Instances */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="instances">Actives</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Tab: Instances actives */}
        <TabsContent value="instances" className="space-y-3">
          {loadingInstances ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Aucune promotion active
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("templates")}>
                Activer un template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInstances.map((instance) => (
                <PromotionInstanceCard
                  key={instance.id}
                  instance={instance}
                  onPause={handlePause}
                  onResume={handleResume}
                  onComplete={handleComplete}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-3">
          {loadingTemplates ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Aucun template disponible
              </p>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Créer un template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <PromotionTemplateCard
                  key={template.id}
                  template={template}
                  onActivate={openActivationDialog}
                  onEdit={(template) => console.log("Edit:", template)}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bouton flottant pour créer un nouveau template */}
      <Button
        size="lg"
        className="fixed bottom-20 right-4 rounded-full shadow-lg h-14 w-14 p-0">
        <Plus className="h-6 w-6" />
      </Button>

      {/* Dialog d'activation */}
      <ActivationDialog
        template={selectedTemplate}
        open={showActivationDialog}
        onOpenChange={setShowActivationDialog}
        onActivate={handleTemplateActivation}
      />
    </div>
  );
};

export default MobilePromotions;
