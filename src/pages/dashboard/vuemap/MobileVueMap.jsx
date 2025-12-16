import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
const MobileVueMap = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      MobileVueMap
    </div>
  );
};

export default MobileVueMap;
