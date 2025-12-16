import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
const MobileAdresse = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      MobileAdresse
    </div>
  );
};

export default MobileAdresse;
