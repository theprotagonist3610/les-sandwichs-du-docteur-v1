import useBreakpoint from "@/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
const MobileEmptyLayout = () => {
  const { isMobile } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isMobile);
  }, [isMobile]);
  return (
    <div
      className="min-h-screen bg-background"
      style={{ display: visible ? "block" : "none" }}>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
const DesktopEmptyLayout = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);
  return (
    <div
      className="min-h-screen bg-background"
      style={{ display: visible ? "block" : "none" }}>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
const EmptyLayout = () => {
  return (
    <>
      <MobileEmptyLayout />
      <DesktopEmptyLayout />
    </>
  );
};

export default EmptyLayout;
