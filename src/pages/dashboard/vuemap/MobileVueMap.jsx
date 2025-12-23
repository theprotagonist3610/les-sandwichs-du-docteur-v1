import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import EmplacementsMapWrapper from "@/components/map/EmplacementsMapWrapper";

const MobileVueMap = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div style={{ display: visible ? "block" : "none" }}>
      <EmplacementsMapWrapper viewBox="0 0 340 400" height="400" isMobile={true} />
    </div>
  );
};

export default MobileVueMap;
