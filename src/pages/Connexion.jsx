import Login from "./connexion/Login";
import Register from "./connexion/Register";
import { useEffect, useState } from "react";
const Connexion = () => {
  const [showLogin, setShowLogin] = useState(true);
  const toggleForm = () => {
    setShowLogin(!showLogin);
  };
  return (
    <>
      {showLogin ? (
        <Login toggleForm={toggleForm} />
      ) : (
        <Register toggleForm={toggleForm} />
      )}
    </>
  );
};

export default Connexion;
