import MobilePromotions from "./promotions/MobilePromotions";
import DesktopPromotions from "./promotions/DesktopPromotions";
const Promotions = () => {
  return (
    <div>
      <MobilePromotions />
      <DesktopPromotions />
    </div>
  );
};

export default Promotions;
