import MobileCloture from "./comptabilite/cloture/MobileCloture";
import DesktopCloture from "./comptabilite/cloture/DesktopCloture";

const Cloture = () => {
  return (
    <div>
      <MobileCloture />
      <DesktopCloture />
    </div>
  );
};

export default Cloture;
