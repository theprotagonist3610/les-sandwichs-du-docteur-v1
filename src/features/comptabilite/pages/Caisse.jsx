import MobileCaisse from "./comptabilite/caisse/MobileCaisse";
import DesktopCaisse from "./comptabilite/caisse/DesktopCaisse";
const Caisse = () => {
  return (
    <div>
      <MobileCaisse />
      <DesktopCaisse />
    </div>
  );
};

export default Caisse;
