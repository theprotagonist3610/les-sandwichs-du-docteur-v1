import { RouterProvider } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { createAppRouter } from "@/routes/Routes";
import { Toaster } from "@/shared/components/ui/sonner";
import { initializeConnectivityListeners } from "@/store/connectivityStore";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import useUserPresence from "@/features/auth/hooks/useUserPresence";
import usePWAUpdate from "@/shared/hooks/usePWAUpdate";

function App() {
  const { user, loadUserFromSession } = useActiveUserStore();

  useUserPresence(user?.id);
  usePWAUpdate();

  const router = useMemo(() => createAppRouter(user?.role), [user?.role]);

  useEffect(() => {
    loadUserFromSession();
  }, [loadUserFromSession]);

  useEffect(() => {
    const cleanup = initializeConnectivityListeners();
    return cleanup;
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
