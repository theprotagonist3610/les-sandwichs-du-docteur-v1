import { Link, useLocation } from "react-router-dom";
import { useMemo } from "react";
import {
  Home,
  ShoppingCart,
  Landmark,
  Share2,
  ToolCase,
  Store,
  History,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useActiveUserStore from "@/features/auth/store/activeUserStore";

// 5 destinations par rôle — règle bottom-nav-limit
const NAV_VENDEUR = [
  { path: "/",                  label: "Accueil",    icon: Home        },
  { path: "/commandes",         label: "Commandes",  icon: ShoppingCart },
  { path: "/panneau-de-vente",  label: "Vente",      icon: Store        },
  { path: "/adresses-livraison",label: "Adresses",   icon: Users        },
  { path: "/outils",            label: "Outils",     icon: ToolCase     },
];

const NAV_SUPERVISEUR = [
  { path: "/",              label: "Accueil",      icon: Home         },
  { path: "/commandes",     label: "Commandes",    icon: ShoppingCart  },
  { path: "/comptabilite",  label: "Comptabilité", icon: Landmark     },
  { path: "/distribution",  label: "Distribution", icon: Share2       },
  { path: "/outils",        label: "Outils",       icon: ToolCase     },
];

const MobileNavbar = ({ className }) => {
  const location = useLocation();
  const { user } = useActiveUserStore();

  const navItems = useMemo(
    () => (user?.role === "vendeur" ? NAV_VENDEUR : NAV_SUPERVISEUR),
    [user?.role]
  );

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={cn(
        "bg-card/95 backdrop-blur-sm border-t border-border",
        className
      )}
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch justify-around">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                // Touch target min 56px (dépasse le minimum de 44px)
                "flex flex-col items-center justify-center gap-1 min-h-[56px] flex-1 px-1 pt-1",
                "transition-colors duration-150",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Indicateur actif en haut (color-not-only : couleur + trait) */}
              <span
                className={cn(
                  "absolute top-0 h-0.5 w-10 rounded-full transition-colors duration-150",
                  active ? "bg-primary" : "bg-transparent"
                )}
              />
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavbar;
