import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import CaisseView from "@/features/comptabilite/components/CaisseView";

const DesktopCaisse = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <CaisseView />
    </div>
  );
};

export default DesktopCaisse;
