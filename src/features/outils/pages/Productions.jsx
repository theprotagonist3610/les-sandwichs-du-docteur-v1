import useBreakpoint       from "@/shared/hooks/useBreakpoint";
import useProductions       from "@/features/outils/hooks/useProductions";
import DesktopProductions   from "./productions/DesktopProductions";
import MobileProductions    from "./productions/MobileProductions";

const Productions = () => {
  const { isMobile } = useBreakpoint();
  const hook         = useProductions();

  return isMobile
    ? <MobileProductions hook={hook} />
    : <DesktopProductions hook={hook} />;
};

export default Productions;
