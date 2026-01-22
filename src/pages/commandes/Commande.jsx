import MobileCommande from "./commande/MobileCommande";
import DesktopCommande from "./commande/DesktopCommande";
const Commande = () => {
  return (
    <div>
      <MobileCommande />
      <DesktopCommande />
    </div>
  );
};

export default Commande;
