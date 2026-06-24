import { create } from "zustand";

export const useCommandeRefreshStore = create((set) => ({
  lastRefresh: null,
  lastCommandeId: null,
  changeType: null,

  triggerRefresh: (commandeId, type = "insert") => {
    const now = new Date().getTime();
    set({
      lastRefresh: now,
      lastCommandeId: commandeId,
      changeType: type,
    });
  },

  reset: () => {
    set({
      lastRefresh: null,
      lastCommandeId: null,
      changeType: null,
    });
  },
}));

export default useCommandeRefreshStore;
