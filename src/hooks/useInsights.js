/**
 * useInsights.js
 * Hook React pour consommer le moteur d'insights.
 *
 * Usage :
 *   const { insights, urgents, parCategorie, loading, error, horizon, setHorizon, refresh } = useInsights();
 */

import { useState, useEffect, useCallback } from "react";
import { generateInsights, HORIZONS } from "@/utils/insightsToolkit/insightsToolkit";

const useInsights = (initialHorizon = HORIZONS.H24) => {
  const [horizon,      setHorizon]      = useState(initialHorizon);
  const [insights,     setInsights]     = useState([]);
  const [urgents,      setUrgents]      = useState([]);
  const [parCategorie, setParCategorie] = useState({});
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInsights(horizon);
      setInsights(result.insights);
      setUrgents(result.urgents);
      setParCategorie(result.parCategorie);
      setTotal(result.total);
    } catch (err) {
      console.error("[useInsights]", err);
      setError("Impossible de charger les insights.");
    } finally {
      setLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    insights,
    urgents,
    parCategorie,
    total,
    loading,
    error,
    horizon,
    setHorizon,
    refresh: fetch,
  };
};

export default useInsights;
