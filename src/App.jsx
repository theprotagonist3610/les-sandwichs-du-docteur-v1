import { RouterProvider } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { createAppRouter } from "./routes/Routes";
import CookiesAgreement from "./components/CookiesAgreement";
import { Toaster } from "@/components/ui/sonner";
import { initializeConnectivityListeners } from "@/store/connectivityStore";
import useActiveUserStore from "@/store/activeUserStore";

function App() {
  // Récupérer le rôle de l'utilisateur actif
  const { user } = useActiveUserStore();

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
