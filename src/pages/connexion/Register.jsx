import MobileRegister from "./register/MobileRegister";
import DesktopRegister from "./register/DesktopRegister";
const Register = ({ toggleForm }) => {
  return (
    <>
      <MobileRegister toggleForm={toggleForm} />
      <DesktopRegister toggleForm={toggleForm} />
    </>
  );
};

export default Register;
