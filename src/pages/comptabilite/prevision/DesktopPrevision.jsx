import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import PrevisionView from "@/components/comptabilite/PrevisionView";

const DesktopPrevision = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <PrevisionView />
    </div>
  );
};

export default DesktopPrevision;
