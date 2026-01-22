import MobileCommandesEnAttente from "./commandesEnAttente/MobileCommandesEnAttente";
import DesktopCommandesEnAttente from "./commandesEnAttente/DesktopCommandesEnAttente";
const CommandesEnAttente = () => {
  return (
    <div>
      <MobileCommandesEnAttente />
      <DesktopCommandesEnAttente />
    </div>
  );
};

export default CommandesEnAttente;
