import { create } from "zustand";

/**
 * Store pour gérer l'état de connectivité réseau
 */
export const useConnectivityStore = create((set, get) => ({
  // État de la connexion
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isTransitioning: false, // État de transition (en cours de reconnexion)

  // Informations sur la connexion (Network Information API)
  connectionType: "unknown", // 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown'
  effectiveType: "4g", // 'slow-2g' | '2g' | '3g' | '4g'
  downlink: null, // Vitesse de téléchargement en Mbps
  rtt: null, // Round-trip time en ms
  saveData: false, // Mode économie de données

  // Métadonnées
  lastOnlineTime: Date.now(),
  lastOfflineTime: null,
  lastUpdate: Date.now(), // Dernière mise à jour des informations

  // Fonctions
  setOnline: (isOnline) => {
    const state = get();
    const wasOnline = state.isOnline;

    // Si on passe de offline à online, marquer comme en transition
    if (!wasOnline && isOnline) {
      set({ isTransitioning: true });
      // Retirer l'état de transition après 1 seconde
      setTimeout(() => set({ isTransitioning: false }), 1000);
    }

    set({
      isOnline,
      lastOnlineTime: isOnline ? Date.now() : state.lastOnlineTime,
      lastOfflineTime: !isOnline ? Date.now() : state.lastOfflineTime,
      lastUpdate: Date.now(),
    });
  },

  updateConnectionInfo: (info) => {
    set({
      connectionType: info.type || "unknown",
      effectiveType: info.effectiveType || "4g",
      downlink: info.downlink || null,
      rtt: info.rtt || null,
      saveData: info.saveData || false,
      lastUpdate: Date.now(),
    });
  },

  setTransitioning: (isTransitioning) => {
    set({ isTransitioning });
  },

  // Obtenir une description textuelle de la vitesse
  getConnectionSpeed: () => {
    const state = get();
    if (!state.isOnline) return "Hors ligne";

    switch (state.effectiveType) {
      case "slow-2g":
        return "Très lente (2G)";
      case "2g":
        return "Lente (2G)";
      case "3g":
        return "Moyenne (3G)";
      case "4g":
        return "Rapide (4G)";
      default:
        return "Inconnue";
    }
  },

  // Obtenir une couleur selon la vitesse
  getConnectionColor: () => {
    const state = get();
    if (!state.isOnline) return "text-destructive";

    switch (state.effectiveType) {
      case "slow-2g":
      case "2g":
        return "text-orange-500";
      case "3g":
        return "text-yellow-500";
      case "4g":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  },
}));

/**
 * Hook pour faciliter l'utilisation du store
 */
export const useConnectivity = () => {
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const isTransitioning = useConnectivityStore((state) => state.isTransitioning);
  const connectionType = useConnectivityStore((state) => state.connectionType);
  const effectiveType = useConnectivityStore((state) => state.effectiveType);
  const downlink = useConnectivityStore((state) => state.downlink);
  const rtt = useConnectivityStore((state) => state.rtt);
  const saveData = useConnectivityStore((state) => state.saveData);
  const lastUpdate = useConnectivityStore((state) => state.lastUpdate);
  const setOnline = useConnectivityStore((state) => state.setOnline);
  const updateConnectionInfo = useConnectivityStore(
    (state) => state.updateConnectionInfo
  );
  const getConnectionSpeed = useConnectivityStore(
    (state) => state.getConnectionSpeed
  );
  const getConnectionColor = useConnectivityStore(
    (state) => state.getConnectionColor
  );

  return {
    isOnline,
    isTransitioning,
    connectionType,
    effectiveType,
    downlink,
    rtt,
    saveData,
    lastUpdate,
    setOnline,
    updateConnectionInfo,
    getConnectionSpeed,
    getConnectionColor,
  };
};

/**
 * Initialiser les écouteurs de connectivité
 * À appeler dans App.jsx ou un composant racine
 */
export const initializeConnectivityListeners = () => {
  const { setOnline, updateConnectionInfo } = useConnectivityStore.getState();

  // Écouter les changements online/offline avec vérification
  const handleOnline = () => {
    setOnline(true);
    // Vérifier immédiatement la qualité de connexion après reconnexion
    if ("connection" in navigator || "mozConnection" in navigator || "webkitConnection" in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      updateConnectionInfo({
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    }
  };

  const handleOffline = () => setOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Vérification périodique de la connexion (toutes les 30 secondes)
  const intervalId = setInterval(() => {
    const currentOnlineStatus = navigator.onLine;
    const storeStatus = useConnectivityStore.getState().isOnline;

    // Synchroniser l'état si différent
    if (currentOnlineStatus !== storeStatus) {
      setOnline(currentOnlineStatus);
    }

    // Mettre à jour les infos de connexion si en ligne
    if (currentOnlineStatus && ("connection" in navigator || "mozConnection" in navigator || "webkitConnection" in navigator)) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      updateConnectionInfo({
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    }
  }, 30000); // 30 secondes

  // Network Information API (si disponible)
  if ("connection" in navigator || "mozConnection" in navigator || "webkitConnection" in navigator) {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    // Mise à jour initiale
    updateConnectionInfo({
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    });

    // Écouter les changements en temps réel
    const handleConnectionChange = () => {
      updateConnectionInfo({
        type: connection.type,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    connection.addEventListener("change", handleConnectionChange);

    // Fonction de nettoyage
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      connection.removeEventListener("change", handleConnectionChange);
      clearInterval(intervalId);
    };
  }

  // Si pas de Network Information API, retourner seulement le nettoyage online/offline
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    clearInterval(intervalId);
  };
};
