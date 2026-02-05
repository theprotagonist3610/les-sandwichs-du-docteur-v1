import MobileBudget from "./budget/MobileBudget";
import DesktopBudget from "./budget/DesktopBudget";
const Budget = () => {
  return (
    <div>
      <MobileBudget />
      <DesktopBudget />
    </div>
  );
};

export default Budget;
