import { useEffect } from "react";
import MobilePanneauDeVente from "./panneauDeVente/MobilePanneauDeVente";
import DesktopPanneauDeVente from "./panneauDeVente/DesktopPanneauDeVente";
import usePointDeVenteStore from "@/store/pointDeVenteStore";

const PanneauDeVente = () => {
  const clearPointDeVente = usePointDeVenteStore(
    (state) => state.clearPointDeVente
  );

  // Réinitialiser la sélection du point de vente à chaque ouverture de la page
  useEffect(() => {
    clearPointDeVente();
  }, [clearPointDeVente]);

  return (
    <div>
      <MobilePanneauDeVente />
      <DesktopPanneauDeVente />
    </div>
  );
};

export default PanneauDeVente;
