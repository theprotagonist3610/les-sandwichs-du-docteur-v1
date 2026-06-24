import { create } from "zustand";
import { persist } from "zustand/middleware";

const usePointDeVenteStore = create(
  persist(
    (set, get) => ({
      selectedPointDeVente: null,
      isSelected: false,

      setPointDeVente: (emplacement) => {
        set({
          selectedPointDeVente: emplacement,
          isSelected: true,
        });
      },

      clearPointDeVente: () => {
        sessionStorage.removeItem("point-de-vente-storage");
        set({
          selectedPointDeVente: null,
          isSelected: false,
        });
      },

      getPointDeVenteId: () => {
        const state = get();
        return state.selectedPointDeVente?.id || null;
      },

      hasPointDeVente: () => {
        const state = get();
        return state.isSelected && state.selectedPointDeVente !== null;
      },
    }),
    {
      name: "point-de-vente-storage",
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
    }
  )
);

export { usePointDeVenteStore };
