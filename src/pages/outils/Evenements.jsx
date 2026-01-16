import MobileEvenements from "./evenements/MobileEvenements";
import DesktopEvenements from "./evenements/DesktopEvenements";
const Evenements = () => {
  return (
    <>
      <DesktopEvenements />
      <MobileEvenements />
    </>
  );
};

export default Evenements;
