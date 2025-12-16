import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
const DesktopVueMap = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      DesktopVueMap
    </div>
  );
};

export default DesktopVueMap;
