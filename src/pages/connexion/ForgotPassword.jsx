import MobileForgotPassword from "./forgot-password/MobileForgotPassword";
import DesktopForgotPassword from "./forgot-password/DesktopForgotPassword";

const ForgotPassword = () => {
  return (
    <>
      <MobileForgotPassword />
      <DesktopForgotPassword />
    </>
  );
};

export default ForgotPassword;
