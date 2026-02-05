import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import EncaissementsList from "@/components/comptabilite/EncaissementsList";

const DesktopEncaissement = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <EncaissementsList />
    </div>
  );
};

export default DesktopEncaissement;
