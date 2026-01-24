import { useCallback } from "react";
import useBreakpoint from "@/hooks/useBreakpoint";
import usePromotionTemplates from "@/hooks/usePromotionTemplates";
import usePromotionInstances from "@/hooks/usePromotionInstances";
import MobilePromotions from "./promotions/MobilePromotions";
import DesktopPromotions from "./promotions/DesktopPromotions";

/**
 * Page Promotions - Point d'entrée unique
 * Les hooks sont centralisés ici pour éviter les instances multiples
 * et assurer la réactivité entre les vues mobile et desktop
 */
const Promotions = () => {
  const { isMobile, isDesktop } = useBreakpoint();

  // Hooks centralisés - une seule instance pour toutes les vues
  const {
    templates,
    loading: loadingTemplates,
    handleActivate,
    handleDelete: handleDeleteTemplate,
    handleSearch: handleSearchTemplates,
    handleCreate: handleCreateTemplate,
    handleUpdate: handleUpdateTemplate,
    reload: reloadTemplates,
  } = usePromotionTemplates();

  const {
    instances,
    stats,
    loading: loadingInstances,
    handlePause,
    handleResume,
    handleCancel,
    handleComplete,
    handleDelete: handleDeleteInstance,
    handleSearch: handleSearchInstances,
    reload: reloadInstances,
    reloadStats,
  } = usePromotionInstances();

  // Fonction d'activation qui recharge aussi les instances
  const handleActivateWithReload = useCallback(
    async (templateId, activationData) => {
      const result = await handleActivate(templateId, activationData);
      if (result.success) {
        // Recharger les instances après activation réussie
        await reloadInstances();
        await reloadStats();
      }
      return result;
    },
    [handleActivate, reloadInstances, reloadStats]
  );

  // Props communes pour les deux vues
  const sharedProps = {
    // Templates
    templates,
    loadingTemplates,
    handleActivate: handleActivateWithReload,
    handleDeleteTemplate,
    handleSearchTemplates,
    handleCreateTemplate,
    handleUpdateTemplate,
    reloadTemplates,

    // Instances
    instances,
    stats,
    loadingInstances,
    handlePause,
    handleResume,
    handleCancel,
    handleComplete,
    handleDeleteInstance,
    handleSearchInstances,
    reloadInstances,
    reloadStats,
  };

  return (
    <div>
      {isMobile && <MobilePromotions {...sharedProps} />}
      {isDesktop && <DesktopPromotions {...sharedProps} />}
    </div>
  );
};

export default Promotions;
