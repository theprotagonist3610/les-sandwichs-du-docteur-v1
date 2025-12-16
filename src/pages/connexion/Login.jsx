import MobileLogin from "./login/MobileLogin";
import DesktopLogin from "./login/DesktopLogin";
const Login = ({ toggleForm }) => {
  return (
    <>
      <MobileLogin toggleForm={toggleForm} />
      <DesktopLogin toggleForm={toggleForm} />
    </>
  );
};

export default Login;
