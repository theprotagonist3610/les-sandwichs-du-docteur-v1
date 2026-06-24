import { useEffect, useRef } from "react";
import { updateLastSeen } from "@/features/auth/services/userService";

const useUserPresence = (userId) => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const updatePresence = () => updateLastSeen(userId);

    updatePresence();
    intervalRef.current = setInterval(updatePresence, 180000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updatePresence();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId]);
};

export default useUserPresence;
