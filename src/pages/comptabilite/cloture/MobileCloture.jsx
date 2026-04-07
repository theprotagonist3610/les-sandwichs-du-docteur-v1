import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import ClotureJournaliereView from "@/components/comptabilite/ClotureJournaliereView";

const MobileCloture = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <ClotureJournaliereView />
    </div>
  );
};

export default MobileCloture;
