import MobileFournisseurs from "./fournisseurs/MobileFournisseurs";
import DesktopFournisseurs from "./fournisseurs/DesktopFournisseurs";
const Fournisseurs = () => {
  return (
    <div>
      <MobileFournisseurs />
      <DesktopFournisseurs />
    </div>
  );
};

export default Fournisseurs;
