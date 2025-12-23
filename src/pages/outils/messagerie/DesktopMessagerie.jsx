import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";

const DesktopMessagerie = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen space-y-6"
      style={{ display: visible ? "block" : "none" }}>
      DesktopMessagerie
    </div>
  );
};

export default DesktopMessagerie;
