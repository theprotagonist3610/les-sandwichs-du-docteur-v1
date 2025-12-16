import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mb-4">
        Page non trouvée
      </h2>
      <p className="text-muted-foreground mb-8">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
    </div>
  );
};

export default NotFound;
