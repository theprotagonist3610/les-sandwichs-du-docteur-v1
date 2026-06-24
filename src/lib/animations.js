/**
 * animations.js — Source unique de toutes les animations du projet.
 *
 * RÈGLE : toute animation passe par ce fichier. Framer Motion est banni.
 * Importer gsap directement dans les composants est interdit.
 *
 * Usage dans un composant :
 *   import { useGSAP } from "@/shared/hooks/useGSAP";
 *   import { fadeInUp, staggerFadeInUp } from "@/lib/animations";
 *
 *   const containerRef = useRef(null);
 *   useGSAP(() => { fadeInUp(containerRef.current); }, { scope: containerRef });
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(ScrollTrigger, Flip);

// ─────────────────────────────────────────────────────────────────────────────
// REDUCED MOTION — respecter prefers-reduced-motion
// Si activé, les entrées s'appliquent instantanément (état final direct, sans tween)
// ─────────────────────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Remplace gsap.fromTo : applique l'état final immédiatement si reduced-motion
const safeFromTo = (el, from, to) =>
  prefersReducedMotion() ? gsap.set(el, to) : gsap.fromTo(el, from, to);

// ─────────────────────────────────────────────────────────────────────────────
// ENTRÉES — fade + translation Y (pattern le plus commun de la v1)
// Remplace : initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
// ─────────────────────────────────────────────────────────────────────────────

export const fadeInUp = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", ...options });

export const fadeInDown = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// ENTRÉES — fade + translation X
// Remplace : initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
// ─────────────────────────────────────────────────────────────────────────────

export const fadeInLeft = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out", ...options });

export const fadeInRight = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.2, ease: "power2.out", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// SORTIES — exit animations (remplacent AnimatePresence exit props)
// ─────────────────────────────────────────────────────────────────────────────

export const slideOutDown = (el, options = {}) =>
  gsap.to(el, { y: 100, opacity: 0, duration: 0.3, ease: "power2.in", ...options });

export const slideOutLeft = (el, options = {}) =>
  gsap.to(el, { x: -20, opacity: 0, duration: 0.2, ease: "power2.in", ...options });

export const slideOutRight = (el, options = {}) =>
  gsap.to(el, { x: 20, opacity: 0, duration: 0.2, ease: "power2.in", ...options });

export const fadeOut = (el, options = {}) =>
  gsap.to(el, { opacity: 0, duration: 0.2, ease: "power1.in", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// SCALE — entrées avec scale
// ─────────────────────────────────────────────────────────────────────────────

// Remplace : initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
// Utilisé dans PaymentConfirmation (container), CommandesEnAttente, etc.
export const scaleIn = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power1.out", ...options });

export const scaleInTight = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.15, ease: "power2.out", ...options });

export const scaleInSmall = (el, options = {}) =>
  safeFromTo(el, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.2, ease: "power1.out", ...options });

export const scaleOut = (el, options = {}) =>
  gsap.to(el, { opacity: 0, scale: 0.8, duration: 0.2, ease: "power2.in", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// SPRING — animations avec rebond (remplacent type: "spring" de Framer)
// ─────────────────────────────────────────────────────────────────────────────

// Remplace : initial={{ scale: 0 }} transition={{ type: "spring", stiffness: 200 }}
// Utilisé dans PaymentConfirmation (icône CheckCircle)
export const springScaleIn = (el, options = {}) =>
  safeFromTo(el, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out", ...options });

export const springSlideUp = (el, options = {}) =>
  safeFromTo(el, { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", ...options });

export const fadeIn = (el, options = {}) =>
  safeFromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIONS — hover et tap (remplacent whileHover / whileTap)
// Retournent une fonction de cleanup à appeler dans le useEffect/useGSAP return.
// ─────────────────────────────────────────────────────────────────────────────

// Remplace : whileHover={{ y: -4 }}
// Utilisé sur CommandeCard (grille), MenuCard (menus/), MenuStats
// Neo Brutalism : hover = translate up-left + shadow grows (via CSS), pas de Y seul
export const applyHoverLift = (el, distance = 2) => {
  if (prefersReducedMotion()) return () => {};
  const onEnter = () => gsap.to(el, { x: -distance, y: -distance, duration: 0.1, ease: "power1.out" });
  const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.1, ease: "power1.out" });
  el.addEventListener("mouseenter", onEnter);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mouseenter", onEnter);
    el.removeEventListener("mouseleave", onLeave);
  };
};

// Remplace : whileTap={{ scale: 0.97 }} ou whileTap={{ scale: 0.98 }}
// Utilisé sur MenuCard POS (compact = 0.97, desktop = 0.98)
// Neo Brutalism : mechanical press = translate shadow offset, pas de scale
export const applyTapPress = (el, offset = 2) => {
  if (prefersReducedMotion()) return () => {};
  const onDown = () => gsap.to(el, { x: offset, y: offset, boxShadow: "none", duration: 0.05, ease: "none" });
  const onUp = () => gsap.to(el, { x: 0, y: 0, boxShadow: "var(--shadow-brutal-sm)", duration: 0.05, ease: "none" });
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointerleave", onUp);
  el.addEventListener("pointercancel", onUp);
  return () => {
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointerleave", onUp);
    el.removeEventListener("pointercancel", onUp);
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGGER — entrées en cascade (remplacent le pattern delay: index * 0.1)
// ─────────────────────────────────────────────────────────────────────────────

// Remplace : motion.div avec transition={{ delay: index * 0.1 }} + fadeInUp
// Utilisé dans MenuStats (globalStats), CommandeCard listes, etc.
export const staggerFadeInUp = (els, options = {}) => {
  if (prefersReducedMotion()) return gsap.set(els, { opacity: 1, y: 0 });
  const { stagger = 0.1, ...rest } = options;
  return gsap.fromTo(els, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3, stagger, ease: "power2.out", ...rest });
};

export const staggerScaleIn = (els, options = {}) => {
  if (prefersReducedMotion()) return gsap.set(els, { opacity: 1, scale: 1 });
  const { stagger = 0.1, ...rest } = options;
  return gsap.fromTo(els, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3, stagger, ease: "power1.out", ...rest });
};

// ─────────────────────────────────────────────────────────────────────────────
// SÉQUENCE — écran de confirmation commande (PaymentConfirmation)
// Remplace 5 motion.div indépendants avec delays 0, 0.2, 0.3, 0.4, 0.5
// ─────────────────────────────────────────────────────────────────────────────

export const animateConfirmationScreen = ({ container, icon, message, card, actions }) => {
  if (prefersReducedMotion()) {
    gsap.set([container, icon, message, card, actions], { opacity: 1, scale: 1, y: 0 });
    return gsap.timeline();
  }
  const tl = gsap.timeline();
  tl.fromTo(container,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out" }
    )
    .fromTo(icon,
      { scale: 0 },
      { scale: 1, duration: 0.35, ease: "power2.out" },
      "-=0.1"
    )
    .fromTo(message,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
      "-=0.15"
    )
    .fromTo(card,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" },
      "-=0.15"
    )
    .fromTo(actions,
      { opacity: 0 },
      { opacity: 1, duration: 0.15 },
      "-=0.1"
    );
  return tl;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPTEUR ANIMÉ — NumberTicker
// Remplace : useMotionValue + useSpring (damping 60, stiffness 100) + useInView
// ─────────────────────────────────────────────────────────────────────────────

export const countUp = (el, targetValue, options = {}) => {
  const obj = { value: options.from ?? 0 };
  return gsap.to(obj, {
    value: targetValue,
    duration: options.duration ?? 2,
    ease: "power1.out",
    delay: options.delay ?? 0,
    onUpdate() {
      if (el) {
        el.textContent = Intl.NumberFormat("fr-FR", {
          minimumFractionDigits: options.decimalPlaces ?? 0,
          maximumFractionDigits: options.decimalPlaces ?? 0,
        }).format(obj.value);
      }
    },
    scrollTrigger: options.noScroll
      ? undefined
      : {
          trigger: el,
          start: "top 90%",
          once: true,
          ...options.scrollTrigger,
        },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT — réorganisation de grille fluide
// Remplace : <motion.div layout> + AnimatePresence mode="popLayout"
// Utilisé dans MenuCatalog (grille de menus avec filtrage/recherche)
//
// Usage :
//   const state = captureFlip(".flip-item");  // avant le changement d'état
//   setItems(newItems);                        // déclencher le re-render
//   animateFlip(state);                        // après le re-render
// ─────────────────────────────────────────────────────────────────────────────

export const captureFlip = (selector) => Flip.getState(selector);

export const animateFlip = (state, options = {}) =>
  Flip.from(state, {
    duration: 0.4,
    ease: "power1.inOut",
    stagger: 0.05,
    absolute: true,
    ...options,
  });

// ─────────────────────────────────────────────────────────────────────────────
// PRÉSENCE CONDITIONNELLE — helper pour enter/exit sur éléments conditionnels
// Remplace AnimatePresence sur des éléments montés/démontés conditionnellement.
//
// Usage dans un composant :
//   const hide = (el, onComplete) => slideOutDown(el, { onComplete });
//   hide(bannerRef.current, () => setVisible(false));
// ─────────────────────────────────────────────────────────────────────────────

export const withExit = (animateFn) => (el, onComplete) =>
  animateFn(el, { onComplete });

export const exitSlideDown     = withExit(slideOutDown);
export const exitFadeOut       = withExit(fadeOut);
export const exitScaleOut      = withExit(scaleOut);

// Sortie avec translation Y + fade — pour suppressions expressives (CommandeCard annulée, etc.)
export const exitSlideDownFade = (el, onComplete) =>
  prefersReducedMotion()
    ? gsap.set(el, { opacity: 0, onComplete })
    : gsap.to(el, { y: 24, opacity: 0, duration: 0.18, ease: "power2.in", onComplete });

// ─────────────────────────────────────────────────────────────────────────────
// BORDER BEAM — animation décorative en boucle infinie
// Utilisé par shared/components/ui/border-beam.jsx uniquement
// ─────────────────────────────────────────────────────────────────────────────

// Anime le périmètre complet via CSS offset-path + offsetDistance
export const animateBorderBeamFull = (el, { duration = 6, delay = 0, initialOffset = 0, reverse = false } = {}) => {
  if (prefersReducedMotion()) return null;
  return gsap.fromTo(
    el,
    { offsetDistance: `${initialOffset}%` },
    {
      offsetDistance: reverse ? `${-(100 - initialOffset)}%` : `${100 + initialOffset}%`,
      repeat: -1,
      duration,
      ease: "linear",
      delay: -delay,
    }
  );
};

// Anime un seul bord via translation X ou Y
export const animateBorderBeamEdge = (el, { duration = 6, delay = 0, reverse = false, horizontal = true } = {}) => {
  if (prefersReducedMotion()) return null;
  const axis = horizontal ? "x" : "y";
  return gsap.fromTo(
    el,
    { [axis]: "-100%" },
    { [axis]: reverse ? "-200%" : "100%", repeat: -1, duration, ease: "linear", delay: -delay }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DEFAULT — instance gsap brute (usage interne uniquement si nécessaire)
// ─────────────────────────────────────────────────────────────────────────────

export default gsap;
