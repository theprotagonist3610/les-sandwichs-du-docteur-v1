import { useState } from "react";
import { Map, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import DistributionMapSVG     from "@/components/distribution/DistributionMapSVG";
import DistributionLeafletMap from "@/components/distribution/DistributionLeafletMap";

const OngletCarte = () => {
  const [vue, setVue] = useState("simple"); // "simple" | "interactive"

  return (
    <div className="flex flex-col gap-4">

      {/* ── Toggle ── */}
      <div className="flex gap-2">
        <Button
          variant={vue === "simple" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setVue("simple")}>
          <Map className="w-3.5 h-3.5" />
          Carte simple
        </Button>
        <Button
          variant={vue === "interactive" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setVue("interactive")}>
          <Globe className="w-3.5 h-3.5" />
          Carte interactive
        </Button>
      </div>

      {/* ── Contenu ── */}
      {vue === "simple"
        ? <DistributionMapSVG />
        : <DistributionLeafletMap />}
    </div>
  );
};

export default OngletCarte;
