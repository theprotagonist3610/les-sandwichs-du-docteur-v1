import { useState, useLayoutEffect } from "react";
import MobilePanneauDeVente from "./panneauDeVente/MobilePanneauDeVente";
import DesktopPanneauDeVente from "./panneauDeVente/DesktopPanneauDeVente";
import usePointDeVenteStore from "@/store/pointDeVenteStore";

const PanneauDeVente = () => {
  const [isReady, setIsReady] = useState(false);
  const clearPointDeVente = usePointDeVenteStore(
    (state) => state.clearPointDeVente
  );

  // Réinitialiser la sélection du point de vente AVANT le rendu des enfants
  useLayoutEffect(() => {
    clearPointDeVente();
    setIsReady(true);
  }, [clearPointDeVente]);

  // Ne pas rendre les enfants tant que le clear n'est pas fait
  if (!isReady) {
    return null;
  }

  return (
    <div>
      <MobilePanneauDeVente />
      <DesktopPanneauDeVente />
    </div>
  );
};

export default PanneauDeVente;
