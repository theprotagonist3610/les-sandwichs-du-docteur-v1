import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import RevenuView from "@/components/comptabilite/RevenuView";

const DesktopRevenu = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <RevenuView />
    </div>
  );
};

export default DesktopRevenu;
