import MobileMoyensDePaiement from "./moyensdepaiement/MobileMoyensDePaiement";
import DesktopMoyensDePaiement from "./moyensdepaiement/DesktopMoyensDePaiement";
const MoyensDePaiement = () => {
  return (
    <div>
      <MobileMoyensDePaiement />
      <DesktopMoyensDePaiement />
    </div>
  );
};

export default MoyensDePaiement;
