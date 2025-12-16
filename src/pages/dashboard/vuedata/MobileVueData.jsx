import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
const MobileVueData = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      MobileVueData
    </div>
  );
};

export default MobileVueData;
