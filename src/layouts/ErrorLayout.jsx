import { Outlet, useNavigate, useRouteError } from "react-router-dom";

const ErrorLayout = () => {
  const navigate = useNavigate();
  const error = useRouteError();

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-md lg:max-w-2xl flex flex-col items-center gap-6 lg:gap-12">

        <img
          src="/logo-min.png"
          alt="Les Sandwichs du Docteur"
          className="h-20 lg:h-32 w-auto"
        />

        {/* Cause de l'erreur — si aucun Outlet n'est configuré pour la route */}
        {error && (
          <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-sm font-medium text-destructive">
              {error.statusText || error.message || "Une erreur inattendue s'est produite"}
            </p>
            {error.status && (
              <p className="text-xs text-muted-foreground mt-1">Code {error.status}</p>
            )}
          </div>
        )}

        <div className="w-full">
          <Outlet />
        </div>

        <div className="w-full flex flex-col lg:flex-row gap-3 lg:gap-6 lg:justify-center">
          <button
            onClick={() => navigate(-1)}
            className="w-full lg:w-auto px-10 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Retour
          </button>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="w-full lg:w-auto px-10 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Accueil
          </button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Les Sandwichs du Docteur
        </p>
      </div>
    </div>
  );
};

export default ErrorLayout;
