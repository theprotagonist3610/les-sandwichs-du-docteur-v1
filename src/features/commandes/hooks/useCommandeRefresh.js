import { useEffect, useRef } from "react";
import useCommandeRefreshStore from "@/features/commandes/store/commandeRefreshStore";

export const useCommandeRefresh = (
  onRefresh,
  includeInsertOnly = false,
  componentName = "Unknown",
) => {
  const { lastRefresh, changeType, lastCommandeId } = useCommandeRefreshStore();
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!lastRefresh) {
      return;
    }

    if (includeInsertOnly && changeType !== "insert") {
      return;
    }

    if (!onRefreshRef.current) {
      return;
    }

    onRefreshRef.current();
  }, [
    lastRefresh,
    changeType,
    includeInsertOnly,
    componentName,
    lastCommandeId,
  ]);
};

export default useCommandeRefresh;
