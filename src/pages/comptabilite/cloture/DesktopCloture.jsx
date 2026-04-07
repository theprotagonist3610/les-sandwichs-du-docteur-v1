import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import ClotureJournaliereView from "@/components/comptabilite/ClotureJournaliereView";

const DesktopCloture = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <ClotureJournaliereView />
    </div>
  );
};

export default DesktopCloture;
