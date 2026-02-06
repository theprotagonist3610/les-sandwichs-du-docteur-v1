import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import {
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Home,
  ShoppingCart,
  Package,
  BarChart3,
  Calculator,
  Settings,
  Users,
  ToolCase,
  Wifi,
  WifiOff,
  Calendar,
} from "lucide-react";
import logo from "@/assets/logo-min.png";
import { useBorderBeam } from "@/hooks/useBorderBeam";
import { useConnectivity } from "@/store/connectivityStore";
import { useStyleSettings } from "@/store/styleSettingsStore";
import useActiveUserStore from "@/store/activeUserStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const MobileNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // Navigation links recuperes du router - tous les liens disponibles
  const allNavLinks = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/commandes", label: "Commandes", icon: ShoppingCart },
    // { path: "/stock", label: "Stock", icon: Package },
    // { path: "/statistiques", label: "Statistiques", icon: BarChart3 },
    { path: "/comptabilite", label: "Comptabilite", icon: Calculator },
    { path: "/outils", label: "Outils", icon: ToolCase },
    { path: "/parametres", label: "Parametres", icon: Settings },
    { path: "/utilisateurs", label: "Utilisateurs", icon: Users },
  ];

  // Liens accessibles pour les vendeurs uniquement
  const vendeurPaths = ["/", "/commandes", "/outils", "/parametres"];

  // Filtrer les liens selon le rôle de l'utilisateur
  const navLinks = useMemo(() => {
    if (user?.role === "vendeur") {
      return allNavLinks.filter((link) => vendeurPaths.includes(link.path));
    }
    return allNavLinks;
  }, [user?.role]);

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Fonction de déconnexion
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast.success("Déconnexion réussie", {
        description: "À bientôt !",
      });
      closeSidebar();
      navigate("/connexion");
    } else {
      toast.error("Erreur de déconnexion", {
        description: result.error || "Une erreur est survenue",
      });
    }
  };

  return (
    <>
      {/* TopNavbar fixe en haut */}
      <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50 shadow-sm relative">
        {BeamComponent}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </Link>

          {/* Connectivity Status (au milieu) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent/10 border border-border">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
            <span className={`text-xs font-medium ${getConnectionColor()}`}>
              {isOnline ? getConnectionSpeed() : "Hors ligne"}
            </span>
          </div>

          {/* Menu Hamburger */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Toggle menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Overlay sombre */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        />
      )}

      {/* Sidebar fixe a gauche (overlay) */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-50 shadow-lg transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
        <div className="flex flex-col h-full">
          {/* Header de la sidebar */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
            </div>
            <button
              onClick={closeSidebar}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links (disposition verticale) */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="flex flex-col gap-1 px-3">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(link.path)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer avec ThemeSwitcher et UserProfile */}
          <div className="border-t border-border p-4 space-y-2">
            {/* User Profile avec Avatar, Nom et Prénom */}
            {user && (
              <button
                onClick={() => {
                  closeSidebar();
                  navigate("/profil");
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user.photo_url} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {user.prenoms?.charAt(0)}
                    {user.nom?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {user.prenoms} {user.nom}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "admin"
                      ? "Administrateur"
                      : user.role === "superviseur"
                        ? "Superviseur"
                        : "Vendeur"}
                  </p>
                </div>
              </button>
            )}

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
              <span className="text-sm">
                {settings.theme === "auto"
                  ? "Thème Auto"
                  : isDark
                    ? "Mode Clair"
                    : "Mode Sombre"}
              </span>
            </button>

            {/* Bouton Logout */}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Se déconnecter</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileNavbar;
/*
 2 parties TopNavbar et Sidebar pour MobileNavbar
    - TopNavbar : logo + menu hamburger (fixe en haut)
    - Sidebar : liens de navigation (recuperes du router) + ThemeSwitcher + UserProfile
      Disposition verticale avec scroll si necessaire
    - Overlay sombre pour fermer la sidebar en cliquant a l'exterieur
*/
