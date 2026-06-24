const NotFound = () => (
  <div className="flex flex-col items-center justify-center text-center gap-3">
    <p className="text-8xl font-bold text-primary tabular-nums">404</p>
    <h1 className="text-2xl font-semibold text-foreground">Page non trouvée</h1>
    <p className="text-muted-foreground max-w-sm">
      Cette page n'existe pas ou a été déplacée. Utilisez les boutons ci-dessous pour retrouver votre chemin.
    </p>
  </div>
);

export default NotFound;
