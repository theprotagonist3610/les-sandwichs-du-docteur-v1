import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Store pour gérer le point de vente sélectionné
 * Persiste la sélection pendant la session
 */
const usePointDeVenteStore = create(
  persist(
    (set, get) => ({
      // État
      selectedPointDeVente: null, // { id, nom, type, statut, adresse }
      isSelected: false,

      // Actions
      /**
       * Définir le point de vente sélectionné
       * @param {Object} emplacement - Emplacement sélectionné
       */
      setPointDeVente: (emplacement) => {
        set({
          selectedPointDeVente: emplacement,
          isSelected: true,
        });
      },

      /**
       * Réinitialiser la sélection (changement de page, déconnexion, etc.)
       */
      clearPointDeVente: () => {
        set({
          selectedPointDeVente: null,
          isSelected: false,
        });
      },

      /**
       * Obtenir l'ID du point de vente sélectionné
       */
      getPointDeVenteId: () => {
        const state = get();
        return state.selectedPointDeVente?.id || null;
      },

      /**
       * Vérifier si un point de vente est sélectionné
       */
      hasPointDeVente: () => {
        const state = get();
        return state.isSelected && state.selectedPointDeVente !== null;
      },
    }),
    {
      name: "point-de-vente-storage", // Clé dans sessionStorage
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

export default usePointDeVenteStore;
