import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import CaisseView from "@/components/comptabilite/CaisseView";

const MobileCaisse = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <CaisseView />
    </div>
  );
};

export default MobileCaisse;
