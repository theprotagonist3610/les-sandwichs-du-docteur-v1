import { useCallback } from "react";

// commandeToolkit2 non migré — fonctions en attente
export const useCommandeNotifications = () => ({
  subscribeToCommandeNotifications: useCallback(() => () => {}, []),
  requestNotificationPermission: useCallback(async () => ({ granted: false }), []),
  sendNotification: useCallback(async () => ({ success: false }), []),
  createNotification: useCallback(async () => ({ notification: null }), []),
  getUserNotifications: useCallback(async () => ({ notifications: [] }), []),
});

export default useCommandeNotifications;
