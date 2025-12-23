import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
const MobileLivraisons = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      MobileLivraisons
    </div>
  );
};

export default MobileLivraisons;
