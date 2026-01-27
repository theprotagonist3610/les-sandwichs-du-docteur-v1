import { RouterProvider } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { createAppRouter } from "./routes/Routes";
import CookiesAgreement from "./components/CookiesAgreement";
import { Toaster } from "@/components/ui/sonner";
import { initializeConnectivityListeners } from "@/store/connectivityStore";
import useActiveUserStore from "@/store/activeUserStore";
import useUserPresence from "@/hooks/useUserPresence";
import usePWAUpdate from "@/hooks/usePWAUpdate";

function App() {
  // Récupérer le rôle de l'utilisateur actif et la fonction de chargement
  const { user, loadUserFromSession } = useActiveUserStore();

  // Tracker la présence de l'utilisateur connecté
  useUserPresence(user?.id);

  // Vérifier les mises à jour de la PWA et recharger automatiquement
  usePWAUpdate();

  // Créer le router en fonction du rôle de l'utilisateur
  // Le router se recrée automatiquement quand l'utilisateur change
  const router = useMemo(() => {
    return createAppRouter(user?.role);
  }, [user?.role]);

  // Charger l'utilisateur depuis la session Supabase au montage
  useEffect(() => {
    loadUserFromSession();
  }, [loadUserFromSession]);

  // Initialiser les listeners de connectivité au montage
  useEffect(() => {
    const cleanup = initializeConnectivityListeners();
    return cleanup;
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <CookiesAgreement />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
