import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCookieConsent } from "@/store/cookieConsentStore";

const CookiesAgreement = () => {
  const { hasConsent, setConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher la bannière si l'utilisateur n'a pas encore donné son consentement
    if (hasConsent === null) {
      setIsVisible(true);
    }
  }, [hasConsent]);

  const handleAccept = () => {
    setConsent(true);
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsent(false);
    setIsVisible(false);
  };

  const handleClose = () => {
    // Fermer sans décision = refus temporaire
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay pour mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
            onClick={handleClose}
          />

          {/* Bannière de consentement */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:left-4 lg:right-auto lg:max-w-md z-[101]"
          >
            <div className="bg-card border-t lg:border lg:rounded-xl shadow-2xl p-6 lg:p-5">
              {/* Bouton fermer (mobile) */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 lg:hidden text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icône et titre */}
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 mt-1">
                  <Cookie className="w-6 h-6 text-primary" />
                </div>
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

              {/* Détails */}
              <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground">
                <p className="mb-1">
                  <strong>Cookies utilisés :</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <code className="bg-background px-1 rounded">
                      lsd_style_settings
                    </code>{" "}
                    - Vos préférences d&apos;interface
                  </li>
                  <li>
                    <code className="bg-background px-1 rounded">
                      lsd_cookie_consent
                    </code>{" "}
                    - Votre choix de consentement
                  </li>
                </ul>
                <p className="mt-2 text-xs">
                  Sans cookies, vos préférences seront perdues à chaque visite.
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 bg-muted text-foreground hover:bg-muted/80 font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Refuser
                </button>
              </div>

              {/* Note légale */}
              <p className="text-xs text-muted-foreground text-center mt-3">
                Vous pouvez modifier ce choix à tout moment dans les paramètres
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CookiesAgreement;
