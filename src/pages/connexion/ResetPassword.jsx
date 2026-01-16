import MobileResetPassword from "./reset-password/MobileResetPassword";
import DesktopResetPassword from "./reset-password/DesktopResetPassword";

const ResetPassword = () => {
  return (
    <>
      <MobileResetPassword />
      <DesktopResetPassword />
    </>
  );
};

export default ResetPassword;
