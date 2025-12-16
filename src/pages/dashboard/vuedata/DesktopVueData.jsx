import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
const DesktopVueData = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      DesktopVueData
    </div>
  );
};

export default DesktopVueData;
