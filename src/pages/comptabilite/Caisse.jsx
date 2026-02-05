import MobileCaisse from "./caisse/MobileCaisse";
import DesktopCaisse from "./caisse/DesktopCaisse";
const Caisse = () => {
  return (
    <div>
      <MobileCaisse />
      <DesktopCaisse />
    </div>
  );
};

export default Caisse;
