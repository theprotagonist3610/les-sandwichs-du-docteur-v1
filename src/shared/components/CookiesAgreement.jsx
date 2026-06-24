import { useState, useEffect, useRef } from "react";
import { X, Cookie } from "lucide-react";
import { useGSAP } from "@/shared/hooks/useGSAP";
import { fadeIn, springSlideUp, slideOutDown, exitFadeOut } from "@/lib/animations";
import { useCookieConsent } from "@/store/cookieConsentStore";

const CookiesAgreement = () => {
  const { hasConsent, setConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (hasConsent === null) setIsVisible(true);
  }, [hasConsent]);

  // Animate in when visible
  useGSAP(
    () => {
      if (!isVisible || !overlayRef.current || !bannerRef.current) return;
      fadeIn(overlayRef.current);
      springSlideUp(bannerRef.current);
    },
    { scope: containerRef, dependencies: [isVisible] }
  );

  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleDismiss = contextSafe((callback) => {
    const tl = slideOutDown(bannerRef.current, { duration: 0.2 });
    exitFadeOut(overlayRef.current, () => {
      setIsVisible(false);
      callback?.();
    });
  });

  const handleAccept = () => handleDismiss(() => setConsent(true));
  const handleDecline = () => handleDismiss(() => setConsent(false));
  const handleClose = () => handleDismiss();

  if (!isVisible) return null;

  return (
    <div ref={containerRef}>
      {/* Scrim 50% — modal-escape via click */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
        onClick={handleClose}
        style={{ opacity: 0 }}
      />

      {/* Bannière */}
      <div
        ref={bannerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Gestion des cookies"
        className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:left-4 lg:right-auto lg:max-w-md z-[101]"
        style={{ opacity: 0, transform: "translateY(100px)" }}
      >
        <div className="bg-card border-t lg:border lg:rounded-xl shadow-2xl p-6 lg:p-5">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <Cookie className="size-6 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Gestion des cookies
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nous utilisons des cookies pour sauvegarder vos préférences
                d&apos;affichage (thème, police, etc.). Ces cookies restent
                sur votre appareil pendant 1 an.
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground">
            <p className="mb-1"><strong>Cookies utilisés :</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="bg-background px-1 rounded">lsd_style_settings</code> — Préférences d&apos;interface</li>
              <li><code className="bg-background px-1 rounded">lsd_cookie_consent</code> — Choix de consentement</li>
            </ul>
            <p className="mt-2">Sans cookies, vos préférences seront perdues à chaque visite.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 px-4 rounded-lg transition-colors min-h-[44px]"
            >
              Accepter
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 border border-border text-foreground hover:bg-muted font-medium py-2.5 px-4 rounded-lg transition-colors min-h-[44px]"
            >
              Refuser
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Vous pouvez modifier ce choix à tout moment dans les paramètres
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookiesAgreement;
