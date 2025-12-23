import useBreakpoint from "@/hooks/useBreakpoint";
import { useEffect, useState } from "react";
import UsersWidget from "@/components/dashboard/UsersWidget";

const MobileVueData = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);

  return (
    <div
      className="min-h-screen space-y-4"
      style={{ display: visible ? "block" : "none" }}>
      <UsersWidget isMobile={true} />
    </div>
  );
};

export default MobileVueData;
