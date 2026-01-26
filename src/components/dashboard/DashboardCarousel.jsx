import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Composant Carousel pour le Dashboard Mobile
 * Affiche les widgets dans un slider horizontal avec navigation et pagination
 */
const DashboardCarousel = ({ children }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    skipSnaps: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState([]);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Fonction pour scroller vers la slide précédente
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  // Fonction pour scroller vers la slide suivante
  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Fonction pour scroller vers une slide spécifique
  const scrollTo = useCallback(
    (index) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  // Mettre à jour les états de navigation
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  // Initialiser le carousel
  useEffect(() => {
    if (!emblaApi) return;

    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative">
      {/* Container du carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {children.map((child, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 px-4"
              style={{ flex: "0 0 100%" }}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Boutons de navigation - Affichés uniquement s'il y a plusieurs slides */}
      {scrollSnaps.length > 1 && (
        <>
          {/* Bouton Précédent */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg ${
              !canScrollPrev ? "opacity-0 pointer-events-none" : ""
            }`}
            onClick={scrollPrev}
            disabled={!canScrollPrev}>
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Bouton Suivant */}
          <Button
            variant="outline"
            size="icon"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-lg ${
              !canScrollNext ? "opacity-0 pointer-events-none" : ""
            }`}
            onClick={scrollNext}
            disabled={!canScrollNext}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </>
      )}

      {/* Indicateurs de pagination (dots) */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
              onClick={() => scrollTo(index)}
              aria-label={`Aller au widget ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Compteur de slides */}
      {scrollSnaps.length > 1 && (
        <div className="text-center mt-2 text-xs text-muted-foreground">
          Widget {selectedIndex + 1} sur {scrollSnaps.length}
        </div>
      )}
    </div>
  );
};

export default DashboardCarousel;
