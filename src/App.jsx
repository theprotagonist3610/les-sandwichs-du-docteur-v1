import { RouterProvider } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { createAppRouter } from "./routes/Routes";
import CookiesAgreement from "./components/CookiesAgreement";
import { Toaster } from "@/components/ui/sonner";
import { initializeConnectivityListeners } from "@/store/connectivityStore";
import useActiveUserStore from "@/store/activeUserStore";
import useUserPresence from "@/hooks/useUserPresence";

function App() {
  // Récupérer le rôle de l'utilisateur actif
  const { user } = useActiveUserStore();

  // Tracker la présence de l'utilisateur connecté
  useUserPresence(user?.id);

  // Créer le router en fonction du rôle de l'utilisateur
  // Le router se recrée automatiquement quand l'utilisateur change
  const router = useMemo(() => {
    return createAppRouter(user?.role);
  }, [user?.role]);

  // Initialiser les listeners de connectivité au montage
  useEffect(() => {
    const cleanup = initializeConnectivityListeners();
    return cleanup;
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <CookiesAgreement />
      <Toaster />
    </>
  );
}

export default App;
