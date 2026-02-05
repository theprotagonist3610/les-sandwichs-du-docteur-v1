import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import PrevisionView from "@/components/comptabilite/PrevisionView";

const MobilePrevision = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <PrevisionView />
    </div>
  );
};

export default MobilePrevision;
