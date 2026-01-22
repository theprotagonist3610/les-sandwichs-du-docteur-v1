import MobileGestionDesCommandes from "./gestionDesCommandes/MobileGestionDesCommandes";
import DesktopGestionDesCommandes from "./gestionDesCommandes/DesktopGestionDesCommandes";
const GestionDesCommandes = () => {
  return (
    <div>
      <MobileGestionDesCommandes />
      <DesktopGestionDesCommandes />
    </div>
  );
};

export default GestionDesCommandes;
