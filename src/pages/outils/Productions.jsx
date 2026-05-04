import useBreakpoint       from "@/hooks/useBreakpoint";
import useProductions       from "@/hooks/useProductions";
import DesktopProductions   from "@/pages/outils/productions/DesktopProductions";
import MobileProductions    from "@/pages/outils/productions/MobileProductions";

const Productions = () => {
  const { isMobile } = useBreakpoint();
  const hook         = useProductions();

  return isMobile
    ? <MobileProductions hook={hook} />
    : <DesktopProductions hook={hook} />;
};

export default Productions;
