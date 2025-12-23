import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import EmplacementsMapWrapper from "@/components/map/EmplacementsMapWrapper";

const DesktopEmplacementsMap = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <EmplacementsMapWrapper viewBox="0 0 1200 600" height="600" isMobile={false} />
    </div>
  );
};

export default DesktopEmplacementsMap;
