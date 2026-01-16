import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "@/services/authService";
import * as userService from "@/services/userService";

const useActiveUserStore = create(
  persist(
    (set, get) => ({
      // Données de l'utilisateur actuel
      user: null,
      session: null,
      isLoading: false,
      error: null,

      // Actions de base
      setUser: (userData) => set({ user: userData, error: null }),

      setSession: (sessionData) => set({ session: sessionData }),

      clearUser: () => set({ user: null, session: null, error: null }),

      setError: (error) => set({ error }),

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Actions d'authentification
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { session, profile, error } = await authService.signIn(
            email,
            password
          );

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: profile,
            session,
            isLoading: false,
            error: null,
          });

          return { success: true, user: profile };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors de la connexion";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const { error } = await authService.signOut();

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({ user: null, session: null, isLoading: false, error: null });
          return { success: true };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors de la déconnexion";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { error, message } = await authService.signUp(
            userData.email,
            userData.motDePasse,
            {
              nom: userData.nom,
              prenoms: userData.prenoms,
              telephone: userData.telephone,
              sexe: userData.sexe,
              dateNaissance: userData.dateNaissance,
            }
          );

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          // NE PAS connecter l'utilisateur automatiquement
          // Il doit attendre l'approbation de son compte
          set({ isLoading: false });

          return {
            success: true,
            message:
              message ||
              "Votre compte a été créé et est en attente d'approbation par un administrateur.",
            pendingApproval: true, // Indicateur que le compte est en attente
          };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors de l'inscription";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Charger l'utilisateur depuis la session Supabase
      loadUserFromSession: async () => {
        set({ isLoading: true });
        try {
          const { user, profile, error } =
            await authService.getCurrentUser();

          if (error || !user) {
            set({ user: null, session: null, isLoading: false });
            return { success: false };
          }

          // Vérifier si l'utilisateur est actif
          if (profile && !profile.is_active) {
            await get().logout();
            set({
              error: "Votre compte a été désactivé",
              isLoading: false,
            });
            return { success: false, error: "Compte désactivé" };
          }

          const { session } = await authService.getSession();

          set({
            user: profile,
            session: session,
            isLoading: false,
            error: null,
          });

          return { success: true, user: profile };
        } catch (error) {
          set({
            user: null,
            session: null,
            isLoading: false,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      // Mettre à jour le profil
      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return { success: false, error: "Non authentifié" };

        set({ isLoading: true });
        try {
          const { user: updatedUser, error } =
            await userService.updateUser(user.id, updates);

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });

          return { success: true, user: updatedUser };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors de la mise à jour du profil";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Changer le mot de passe
      changePassword: async (newPassword) => {
        set({ isLoading: true });
        try {
          const { error } = await authService.changePassword(newPassword);

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({ isLoading: false, error: null });
          return { success: true };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors du changement de mot de passe";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Upload photo de profil
      uploadProfilePhoto: async (file) => {
        const { user } = get();
        if (!user) return { success: false, error: "Non authentifié" };

        set({ isLoading: true });
        try {
          const { url, error } = await userService.uploadProfilePhoto(
            user.id,
            file
          );

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set((state) => ({
            user: state.user ? { ...state.user, photo_url: url } : null,
            isLoading: false,
            error: null,
          }));

          return { success: true, url };
        } catch (error) {
          const errorMessage =
            error.message || "Erreur lors de l'upload de la photo";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // Getters helpers
      isAuthenticated: () => {
        const { user } = get();
        return user !== null;
      },

      getUserRole: () => {
        const { user } = get();
        return user?.role || null;
      },

      isSuperviseur: () => {
        const { user } = get();
        return user?.role === "superviseur" || user?.role === "admin";
      },

      isVendeur: () => {
        const { user } = get();
        return user?.role === "vendeur";
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === "admin";
      },

      getUserId: () => {
        const { user } = get();
        return user?.id || null;
      },

      getUserEmail: () => {
        const { user } = get();
        return user?.email || null;
      },

      getFullName: () => {
        const { user } = get();
        return user ? `${user.prenoms} ${user.nom}` : "";
      },
    }),
    {
      name: "active-user-storage", // Nom de la clé dans localStorage
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }), // Persister user et session
    }
  )
);

export default useActiveUserStore;
