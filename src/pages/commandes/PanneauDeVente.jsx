import MobilePanneauDeVente from "./panneauDeVente/MobilePanneauDeVente";
import DesktopPanneauDeVente from "./panneauDeVente/DesktopPanneauDeVente";
const PanneauDeVente = () => {
  return (
    <div>
      <MobilePanneauDeVente />
      <DesktopPanneauDeVente />
    </div>
  );
};

export default PanneauDeVente;
