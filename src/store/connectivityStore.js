import { create } from "zustand";

export const useConnectivityStore = create((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isTransitioning: false,
  connectionType: "unknown",
  effectiveType: "4g",
  downlink: null,
  rtt: null,
  saveData: false,
  lastOnlineTime: Date.now(),
  lastOfflineTime: null,
  lastUpdate: Date.now(),

  setOnline: (isOnline) => {
    const { isOnline: wasOnline } = get();
    if (!wasOnline && isOnline) {
      set({ isTransitioning: true });
      setTimeout(() => set({ isTransitioning: false }), 1000);
    }
    set({
      isOnline,
      lastOnlineTime: isOnline ? Date.now() : get().lastOnlineTime,
      lastOfflineTime: !isOnline ? Date.now() : get().lastOfflineTime,
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

  setTransitioning: (isTransitioning) => set({ isTransitioning }),

  getConnectionSpeed: () => {
    const { isOnline, effectiveType } = get();
    if (!isOnline) return "Hors ligne";
    const labels = { "slow-2g": "Très lente (2G)", "2g": "Lente (2G)", "3g": "Moyenne (3G)", "4g": "Rapide (4G)" };
    return labels[effectiveType] ?? "Inconnue";
  },

  getConnectionColor: () => {
    const { isOnline, effectiveType } = get();
    if (!isOnline) return "text-destructive";
    if (effectiveType === "slow-2g" || effectiveType === "2g") return "text-orange-500";
    if (effectiveType === "3g") return "text-yellow-500";
    if (effectiveType === "4g") return "text-green-500";
    return "text-muted-foreground";
  },
}));

export const useConnectivity = () => ({
  isOnline: useConnectivityStore((s) => s.isOnline),
  isTransitioning: useConnectivityStore((s) => s.isTransitioning),
  connectionType: useConnectivityStore((s) => s.connectionType),
  effectiveType: useConnectivityStore((s) => s.effectiveType),
  downlink: useConnectivityStore((s) => s.downlink),
  rtt: useConnectivityStore((s) => s.rtt),
  saveData: useConnectivityStore((s) => s.saveData),
  lastUpdate: useConnectivityStore((s) => s.lastUpdate),
  setOnline: useConnectivityStore((s) => s.setOnline),
  updateConnectionInfo: useConnectivityStore((s) => s.updateConnectionInfo),
  getConnectionSpeed: useConnectivityStore((s) => s.getConnectionSpeed),
  getConnectionColor: useConnectivityStore((s) => s.getConnectionColor),
});

// Retourne une fonction de cleanup — à appeler dans App.jsx
export const initializeConnectivityListeners = () => {
  const { setOnline, updateConnectionInfo } = useConnectivityStore.getState();

  const getConnection = () =>
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const syncConnectionInfo = () => {
    const conn = getConnection();
    if (conn) {
      updateConnectionInfo({
        type: conn.type,
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      });
    }
  };

  const handleOnline = () => { setOnline(true); syncConnectionInfo(); };
  const handleOffline = () => setOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Synchronise l'état toutes les 30s au cas où les events online/offline se manquent
  const intervalId = setInterval(() => {
    const current = navigator.onLine;
    if (current !== useConnectivityStore.getState().isOnline) setOnline(current);
    if (current) syncConnectionInfo();
  }, 30000);

  const conn = getConnection();
  if (conn) {
    syncConnectionInfo();
    conn.addEventListener("change", syncConnectionInfo);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      conn.removeEventListener("change", syncConnectionInfo);
      clearInterval(intervalId);
    };
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    clearInterval(intervalId);
  };
};
