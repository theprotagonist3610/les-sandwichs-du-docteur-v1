import { useState, useEffect } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import usePromotionTemplates from "@/hooks/usePromotionTemplates";
import usePromotionInstances from "@/hooks/usePromotionInstances";
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

const DesktopPromotions = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  // Hooks pour les templates
  const {
    templates,
    loading: loadingTemplates,
    handleActivate,
    handleDelete: handleDeleteTemplate,
    handleSearch: handleSearchTemplates,
  } = usePromotionTemplates();

  // Hooks pour les instances
  const {
    instances,
    stats,
    loading: loadingInstances,
    handlePause,
    handleResume,
    handleCancel,
    handleComplete,
    handleSearch: handleSearchInstances,
  } = usePromotionInstances();

  // États locaux
  const [activeTab, setActiveTab] = useState("instances");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showActivationDialog, setShowActivationDialog] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

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
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ display: visible ? "block" : "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            Gérez vos templates et promotions actives
          </p>
        </div>
        <Button size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nouveau template
        </Button>
      </div>

      {/* Statistiques */}
      <PromotionStats stats={stats} />

      {/* Barre de recherche et filtres */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une promotion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        {activeTab === "instances" && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
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
        <Button onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          Rechercher
        </Button>
      </div>

      {/* Tabs: Templates vs Instances */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="instances">Promotions actives</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Tab: Instances actives */}
        <TabsContent value="instances" className="space-y-4">
          {loadingInstances ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Aucune promotion active pour le moment
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setActiveTab("templates")}>
                Activer un template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <TabsContent value="templates" className="space-y-4">
          {loadingTemplates ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun template disponible</p>
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Créer un template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

export default DesktopPromotions;
