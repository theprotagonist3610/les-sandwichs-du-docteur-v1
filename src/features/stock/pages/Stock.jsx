import MobileStock from "./outils/stock/MobileStock";
import DesktopStock from "./outils/stock/DesktopStock";

const Stock = () => {
  return (
    <div>
      <MobileStock />
      <DesktopStock />
    </div>
  );
};

export default Stock;
