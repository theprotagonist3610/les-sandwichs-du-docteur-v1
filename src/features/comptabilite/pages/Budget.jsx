import MobileBudget from "./comptabilite/budget/MobileBudget";
import DesktopBudget from "./comptabilite/budget/DesktopBudget";
const Budget = () => {
  return (
    <div>
      <MobileBudget />
      <DesktopBudget />
    </div>
  );
};

export default Budget;
