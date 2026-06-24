import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { ChevronDown, Sun, Moon, Wifi, WifiOff, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-min.png";
import { useConnectivity } from "@/store/connectivityStore";
import { useStyleSettings } from "@/store/styleSettingsStore";
import useActiveUserStore from "@/features/auth/store/activeUserStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { BorderBeam } from "@/shared/components/ui/border-beam";
import { toast } from "sonner";
import { getOutilsParRole } from "@/constants/outils";

const VENDEUR_PATHS = ["/", "/commandes", "/outils", "/parametres"];

const ALL_NAV_LINKS = [
  { path: "/", label: "Dashboard", options: [] },
  { path: "/commandes", label: "Commandes", options: [] },
  { path: "/stock", label: "Stock", options: [] },
  { path: "/comptabilite", label: "Comptabilité", options: [] },
  { path: "/distribution", label: "Distribution", options: [] },
  { path: "/back-day", label: "Back-Day", options: [] },
  { path: "/outils", label: "Outils", options: [] },
  { path: "/parametres", label: "Paramètres", options: [] },
  { path: "/utilisateurs", label: "Utilisateurs", options: [] },
];

const DesktopNavbar = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const { settings, updateSetting } = useStyleSettings();
  const { user, logout } = useActiveUserStore();
  const { isOnline, getConnectionSpeed, getConnectionColor } = useConnectivity();

  const outilsDisponibles = useMemo(() => getOutilsParRole(user?.role), [user?.role]);

  const navLinks = useMemo(() => {
    const links = ALL_NAV_LINKS.map((l) =>
      l.path === "/outils" ? { ...l, options: outilsDisponibles } : l
    );
    return user?.role === "vendeur"
      ? links.filter((l) => VENDEUR_PATHS.includes(l.path))
      : links;
  }, [user?.role, outilsDisponibles]);

  const isActive = (path) => location.pathname === path;

  const toggleTheme = () => {
    const order = ["light", "dark", "auto"];
    const next = order[(order.indexOf(settings.theme) + 1) % order.length];
    updateSetting("theme", next);
  };

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success("Déconnexion réussie", { description: "À bientôt !" });
      navigate("/connexion");
    } else {
      toast.error("Erreur de déconnexion", { description: result.error || "Une erreur est survenue" });
    }
  };

  return (
    <nav className={cn("bg-card/95 backdrop-blur-sm border-b border-border shadow-sm relative", className)}>
      {settings.borderBeamEnabled && (
        <BorderBeam duration={12} borderWidth={2} borderOnly="bottom" />
      )}

      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">

          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logo} alt="Les Sandwichs du Docteur" className="h-10 w-auto" />
          </Link>

          {/* Navigation centrale */}
          <div className="flex items-center gap-0.5">
            {navLinks.map((link, index) => (
              <div key={link.path} className="relative group">
                <Link
                  to={link.path}
                  onMouseEnter={() => link.options.length > 0 && setOpenDropdown(index)}
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-2.5 rounded-md text-sm transition-colors duration-200",
                    isActive(link.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <span>{link.label}</span>
                  {link.options.length > 0 && <ChevronDown className="size-3.5" />}
                  {/* Indicateur actif — couleur + trait (color-not-only) */}
                  {isActive(link.path) && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>

                {link.options.length > 0 && openDropdown === index && (
                  <div
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-[var(--z-dropdown)]"
                  >
                    {link.options.map((option) => {
                      const Icon = option.icon;
                      return (
                        <Link
                          key={option.path}
                          to={option.path}
                          onClick={() => setOpenDropdown(null)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{option.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Statut réseau */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 border border-border">
              {isOnline
                ? <Wifi className="size-4 text-green-600 dark:text-green-400" />
                : <WifiOff className="size-4 text-destructive" />
              }
              <span className={cn("text-xs font-medium", getConnectionColor())}>
                {isOnline ? getConnectionSpeed() : "Hors ligne"}
              </span>
            </div>

            {/* Bascule thème */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label={`Thème : ${settings.theme === "auto" ? "Auto" : settings.theme === "dark" ? "Sombre" : "Clair"}`}
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            {/* Avatar → profil */}
            {user && (
              <button
                onClick={() => navigate("/profil")}
                className="rounded-md hover:bg-accent transition-colors p-1"
                aria-label={`Profil de ${user.prenoms} ${user.nom}`}
              >
                <Avatar className="size-8">
                  <AvatarImage src={user.photo_url} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {user.prenoms?.charAt(0)}{user.nom?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}

            {/* Déconnexion — séparé visuellement des actions principales (destructive-nav-separation) */}
            {user && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Se déconnecter"
              >
                <LogOut className="size-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavbar;
