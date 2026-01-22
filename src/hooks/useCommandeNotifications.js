import { useEffect, useCallback } from "react";
import * as commandeToolkit2 from "@/utils/commandeToolkit2";

/**
 * Hook personnalisé pour gérer les notifications en temps réel
 * S'abonne aux nouvelles commandes et modifications
 */
export const useCommandeNotifications = (userId) => {
  /**
   * S'abonner aux notifications en temps réel
   */
  const subscribeToCommandeNotifications = useCallback(
    (onNotification) => {
      if (!userId) {
        console.warn("userId non fourni pour les notifications");
        return () => {};
      }

      // S'abonner aux notifications Supabase
      const unsubscribe = commandeToolkit2.subscribeToNotifications(
        userId,
        async (notification) => {
          // Appeler le callback avec la notification
          if (onNotification) {
            onNotification(notification);
          }
        },
      );

      return unsubscribe;
    },
    [userId],
  );

  /**
   * Demander la permission pour les notifications push
   */
  const requestNotificationPermission = useCallback(async () => {
    try {
      const { granted, error } =
        await commandeToolkit2.requestNotificationPermission();

      if (error) {
        console.error("Erreur lors de la demande de permission:", error);
      }

      return { granted, error };
    } catch (error) {
      console.error("Exception:", error);
      return { granted: false, error };
    }
  }, []);

  /**
   * Envoyer une notification push locale
   */
  const sendNotification = useCallback(async (options) => {
    try {
      const { success, error } =
        await commandeToolkit2.sendLocalNotification(options);

      if (error) {
        console.error("Erreur lors de l'envoi de notification:", error);
      }

      return { success, error };
    } catch (error) {
      console.error("Exception:", error);
      return { success: false, error };
    }
  }, []);

  /**
   * Créer une notification Supabase
   */
  const createNotification = useCallback(async (notificationData) => {
    try {
      const { notification, error } =
        await commandeToolkit2.createNotification(notificationData);

      if (error) {
        console.error("Erreur lors de la création de notification:", error);
      }

      return { notification, error };
    } catch (error) {
      console.error("Exception:", error);
      return { notification: null, error };
    }
  }, []);

  /**
   * Récupérer les notifications d'un utilisateur
   */
  const getUserNotifications = useCallback(
    async (status = "pending") => {
      if (!userId) {
        console.warn("userId non fourni");
        return { notifications: [], error: null };
      }

      try {
        const { notifications, error } =
          await commandeToolkit2.getUserNotifications(userId, status);

        if (error) {
          console.error(
            "Erreur lors de la récupération des notifications:",
            error,
          );
        }

        return { notifications, error };
      } catch (error) {
        console.error("Exception:", error);
        return { notifications: [], error };
      }
    },
    [userId],
  );

  return {
    subscribeToCommandeNotifications,
    requestNotificationPermission,
    sendNotification,
    createNotification,
    getUserNotifications,
  };
};

export default useCommandeNotifications;
