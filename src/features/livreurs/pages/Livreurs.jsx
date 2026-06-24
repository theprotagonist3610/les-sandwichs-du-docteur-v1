import MobileLivreurs from "./livreurs/MobileLivreurs";
import DesktopLivreurs from "./livreurs/DesktopLivreurs";
const Livreurs = () => {
  return (
    <div>
      <MobileLivreurs />
      <DesktopLivreurs />
    </div>
  );
};

export default Livreurs;
