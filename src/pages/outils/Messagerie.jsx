import MobileMessagerie from "./messagerie/MobileMessagerie";
import DesktopMessagerie from "./messagerie/DesktopMessagerie";
const Messagerie = () => {
  return (
    <div>
      <MobileMessagerie />
      <DesktopMessagerie />
    </div>
  );
};

export default Messagerie;
