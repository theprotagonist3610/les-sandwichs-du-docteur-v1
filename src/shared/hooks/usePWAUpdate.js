import { useEffect } from "react";

export const usePWAUpdate = () => {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const activateWaiting = (registration) => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    };

    const checkUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;
        await registration.update();
        activateWaiting(registration);
      } catch {}
    };

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") activateWaiting(registration);
        });
      });
    });

    checkUpdates();
    const interval = setInterval(checkUpdates, 30_000);
    return () => clearInterval(interval);
  }, []);
};

export default usePWAUpdate;
