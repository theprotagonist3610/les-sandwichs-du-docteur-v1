import { useEffect, useRef } from "react";
import userService from "@/services/userService";

/**
 * Hook pour tracker la présence de l'utilisateur connecté
 * Met à jour le champ last_login_at toutes les 3 minutes
 *
 * @param {string} userId - ID de l'utilisateur connecté
 */
const useUserPresence = (userId) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Fonction pour mettre à jour last_seen
    const updatePresence = async () => {
      try {
        await userService.updateLastSeen(userId);
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la présence:", error);
      }
    };

    // Mettre à jour immédiatement au montage
    updatePresence();

    // Mettre à jour toutes les 3 minutes (180000ms)
    intervalRef.current = setInterval(updatePresence, 180000);

    // Mettre à jour lors de la visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);
};

export default useUserPresence;
