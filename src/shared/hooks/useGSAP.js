/**
 * Re-export du hook officiel @gsap/react.
 * Toujours importer via ce fichier, jamais directement depuis "@gsap/react".
 *
 * Signature :
 *   useGSAP(callback, dependencies?)
 *   useGSAP(callback, { scope: ref, dependencies: [...] })
 *
 * Le hook gère le cleanup GSAP automatiquement (kill des tweens au démontage).
 * contextSafe() sécurise les callbacks déclenchés hors du cycle React (events, timers).
 *
 * Exemple :
 *   const containerRef = useRef(null);
 *   const { contextSafe } = useGSAP({ scope: containerRef });
 *
 *   useGSAP(() => {
 *     fadeInUp(".card");
 *   }, { scope: containerRef });
 *
 *   const handleClose = contextSafe(() => {
 *     exitSlideDown(bannerRef.current, () => setVisible(false));
 *   });
 */
export { useGSAP } from "@gsap/react";
