import MobileEncaissement from "./comptabilite/encaissement/MobileEncaissement";
import DesktopEncaissement from "./comptabilite/encaissement/DesktopEncaissement";
const Encaissement = () => {
  return (
    <div>
      <MobileEncaissement />
      <DesktopEncaissement />
    </div>
  );
};

export default Encaissement;
