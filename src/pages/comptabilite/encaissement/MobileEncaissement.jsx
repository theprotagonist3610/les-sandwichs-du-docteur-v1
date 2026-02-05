import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import EncaissementsList from "@/components/comptabilite/EncaissementsList";

const MobileEncaissement = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen p-4 pb-20"
      style={{ display: visible ? "block" : "none" }}>
      <EncaissementsList />
    </div>
  );
};

export default MobileEncaissement;
