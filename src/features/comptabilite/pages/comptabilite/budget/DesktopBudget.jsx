import useBreakpoint from "@/shared/hooks/useBreakpoint";
import { useState, useEffect } from "react";
import BudgetView from "@/features/comptabilite/components/BudgetView";

const DesktopBudget = () => {
  const { isDesktop } = useBreakpoint();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isDesktop);
  }, [isDesktop]);

  return (
    <div
      className="min-h-screen p-6"
      style={{ display: visible ? "block" : "none" }}>
      <BudgetView />
    </div>
  );
};

export default DesktopBudget;
