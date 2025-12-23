import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
const MobileFournisseurs = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      MobileFournisseurs
    </div>
  );
};

export default MobileFournisseurs;
