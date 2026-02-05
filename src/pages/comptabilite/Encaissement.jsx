import MobileEncaissement from "./encaissement/MobileEncaissement";
import DesktopEncaissement from "./encaissement/DesktopEncaissement";
const Encaissement = () => {
  return (
    <div>
      <MobileEncaissement />
      <DesktopEncaissement />
    </div>
  );
};

export default Encaissement;
