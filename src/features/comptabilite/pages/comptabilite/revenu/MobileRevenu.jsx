import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import RevenuView from "@/features/comptabilite/components/RevenuView";

const MobileRevenu = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <RevenuView />
    </div>
  );
};

export default MobileRevenu;
