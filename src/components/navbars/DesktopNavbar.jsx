import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  ChevronDown,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  LogOut,
} from "lucide-react";
import logo from "@/assets/logo-min.png";
import { useBorderBeam } from "@/hooks/useBorderBeam";
import { useConnectivity } from "@/store/connectivityStore";
import { useStyleSettings } from "@/store/styleSettingsStore";
import useActiveUserStore from "@/store/activeUserStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getOutilsParRole } from "@/constants/outils";

const DesktopNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const { settings, updateSetting } = useStyleSettings();
  const { user, logout } = useActiveUserStore();

  // Border beam hook
  const { BeamComponent } = useBorderBeam({
    duration: 12,
    borderWidth: 2,
    borderOnly: "bottom",
  });

  // Connectivity hook
  const { isOnline, getConnectionSpeed, getConnectionColor } =
    useConnectivity();

  const isActive = (path) => location.pathname === path;

  // Obtenir les outils disponibles pour le rôle de l'utilisateur
  const outilsDisponibles = useMemo(() => {
    return getOutilsParRole(user?.role);
  }, [user?.role]);

  // Navigation links avec dropdowns - tous les liens disponibles
  const allNavLinks = [
    {
      path: "/",
      label: "Dashboard",
      options: [], // Pas de dropdown pour Dashboard
    },
    {
      path: "/commandes",
      label: "Commandes",
      options: [], // Options a ajouter plus tard
    },
    {
      path: "/stock",
      label: "Stock",
      options: [], // Options a ajouter plus tard
    },
    {
      path: "/statistiques",
      label: "Statistiques",
      options: [], // Options a ajouter plus tard
    },
    {
      path: "/comptabilite",
      label: "Comptabilite",
      options: [], // Options a ajouter plus tard
    },
    {
      path: "/outils",
      label: "Outils",
      options: outilsDisponibles, // Filtré selon le rôle
    },
    {
      path: "/parametres",
      label: "Parametres",
      options: [], // Options a ajouter plus tard
    },
    {
      path: "/utilisateurs",
      label: "Utilisateurs",
      options: [], // Options a ajouter plus tard
    },
  ];

  // Liens accessibles pour les vendeurs uniquement
  const vendeurPaths = ["/", "/commandes", "/outils", "/parametres"];

  // Filtrer les liens selon le rôle de l'utilisateur
  const navLinks = useMemo(() => {
    if (user?.role === "vendeur") {
      return allNavLinks.filter((link) => vendeurPaths.includes(link.path));
    }
    return allNavLinks;
  }, [user?.role, outilsDisponibles]);

  const toggleTheme = () => {
    // Cycle: light -> dark -> auto -> light
    const themeOrder = ["light", "dark", "auto"];
    const currentIndex = themeOrder.indexOf(settings.theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    updateSetting("theme", nextTheme);
  };

  // Déterminer l'icône à afficher selon le thème actuel
  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Fonction de déconnexion
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success("Déconnexion réussie", {
        description: "À bientôt !",
      });
      navigate("/connexion");
    } else {
      toast.error("Erreur de déconnexion", {
        description: result.error || "Une erreur est survenue",
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50 shadow-sm relative">
      {BeamComponent}
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo a gauche */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
          </Link>

          {/* Liens de navigation au centre */}
          <div className="flex items-center gap-1">
            {navLinks.map((link, index) => (
              <div key={link.path} className="relative group">
                <Link
                  to={link.path}
                  onMouseEnter={() =>
                    link.options.length > 0 && setOpenDropdown(index)
                  }
                  className={`relative flex items-center gap-1 px-4 py-3 transition-colors duration-200 ${
                    isActive(link.path)
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <span className="text-sm">{link.label}</span>
                  {link.options.length > 0 && (
                    <ChevronDown className="w-4 h-4" />
                  )}

                  {/* Bordure bottom pour lien actif */}
                  {isActive(link.path) && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>
                  )}

                  {/* Bordure bottom animee au survol (gauche a droite) */}
                  {!isActive(link.path) && (
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary/60 transition-all duration-300 ease-out group-hover:w-full"></span>
                  )}
                </Link>

                {/* Dropdown menu (pour les options futures) */}
                {link.options.length > 0 && openDropdown === index && (
                  <div
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                    {link.options.map((option, optIndex) => {
                      const OptionIcon = option.icon;
                      return (
                        <Link
                          key={optIndex}
                          to={option.path}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                          <OptionIcon className="w-4 h-4 shrink-0" />
                          <span>{option.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* UserProfile et ThemeSwitcher a l'extreme droite */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Toggle theme"
              title={`Thème: ${
                settings.theme === "auto"
                  ? "Auto"
                  : settings.theme === "dark"
                  ? "Sombre"
                  : "Clair"
              }`}>
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Connectivity Status */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/10 border border-border">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-xs font-medium ${getConnectionColor()}`}>
                {isOnline ? getConnectionSpeed() : "Hors ligne"}
              </span>
            </div>

            {/* User Profile avec Avatar */}
            {user && (
              <button
                onClick={() => navigate("/profil")}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent transition-colors"
                title={`${user.prenoms} ${user.nom}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.photo_url} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {user.prenoms?.charAt(0)}
                    {user.nom?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}

            {/* Bouton Logout */}
            {user && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Se déconnecter"
                title="Se déconnecter">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DesktopNavbar;
/*
 Barre de navigation fixe en haut pour les ecrans de bureau
 Acces aux differentes sections de l'application
 Affichage dynamique des liens actifs
 Chaque lien peut avoir un dropdown des options supplementaires (structure preparee)
 La disposition est horizontale avec un logo a gauche, les liens au centre,
 le userProfile et le themeSwitcher a l'extreme droite
*/
