import MobileCloture from "./cloture/MobileCloture";
import DesktopCloture from "./cloture/DesktopCloture";

const Cloture = () => {
  return (
    <div>
      <MobileCloture />
      <DesktopCloture />
    </div>
  );
};

export default Cloture;
