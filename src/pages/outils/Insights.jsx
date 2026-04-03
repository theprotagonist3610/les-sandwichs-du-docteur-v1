/**
 * Insights.jsx
 * Analyses intelligentes et recommandations
 * Dual-layout Mobile + Desktop
 */

import MobileInsights from "./insights/MobileInsights";
import DesktopInsights from "./insights/DesktopInsights";

const Insights = () => (
  <>
    <MobileInsights />
    <DesktopInsights />
  </>
);

export default Insights;
