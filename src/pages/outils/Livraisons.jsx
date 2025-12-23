import MobileLivraisons from "./livraisons/MobileLivraisons";
import DesktopLivraisons from "./livraisons/DesktopLivraisons";
const Livraisons = () => {
  return (
    <div>
      <MobileLivraisons />
      <DesktopLivraisons />
    </div>
  );
};

export default Livraisons;
