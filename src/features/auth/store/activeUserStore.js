import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as authService from "@/features/auth/services/authService";
import * as userService from "@/features/auth/services/userService";

const useActiveUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      error: null,

      setUser: (userData) => set({ user: userData, error: null }),
      setSession: (sessionData) => set({ session: sessionData }),
      clearUser: () => set({ user: null, session: null, error: null }),
      setError: (error) => set({ error }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { session, profile, error } = await authService.signIn(email, password);
          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }
          set({ user: profile, session, isLoading: false, error: null });
          return { success: true, user: profile };
        } catch (error) {
          const msg = error.message || "Erreur lors de la connexion";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
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
          const msg = error.message || "Erreur lors de la déconnexion";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
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
          // Pas de connexion auto — compte en attente d'approbation admin
          set({ isLoading: false });
          return {
            success: true,
            message: message || "Votre compte a été créé et est en attente d'approbation.",
            pendingApproval: true,
          };
        } catch (error) {
          const msg = error.message || "Erreur lors de l'inscription";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      loadUserFromSession: async () => {
        set({ isLoading: true });
        try {
          const { user, profile, error } = await authService.getCurrentUser();
          if (error || !user) {
            set({ user: null, session: null, isLoading: false });
            return { success: false };
          }
          if (profile && !profile.is_active) {
            await get().logout();
            set({ error: "Votre compte a été désactivé", isLoading: false });
            return { success: false, error: "Compte désactivé" };
          }
          const { session } = await authService.getSession();
          set({ user: profile, session, isLoading: false, error: null });
          return { success: true, user: profile };
        } catch (error) {
          set({ user: null, session: null, isLoading: false, error: error.message });
          return { success: false, error: error.message };
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return { success: false, error: "Non authentifié" };
        set({ isLoading: true });
        try {
          const { user: updatedUser, error } = await userService.updateUser(user.id, updates);
          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }
          set({ user: updatedUser, isLoading: false, error: null });
          return { success: true, user: updatedUser };
        } catch (error) {
          const msg = error.message || "Erreur lors de la mise à jour du profil";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

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
          const msg = error.message || "Erreur lors du changement de mot de passe";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      uploadProfilePhoto: async (file) => {
        const { user } = get();
        if (!user) return { success: false, error: "Non authentifié" };
        set({ isLoading: true });
        try {
          const { url, error } = await userService.uploadProfilePhoto(user.id, file);
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
          const msg = error.message || "Erreur lors de l'upload de la photo";
          set({ error: msg, isLoading: false });
          return { success: false, error: msg };
        }
      },

      isAuthenticated: () => get().user !== null,
      getUserRole: () => get().user?.role ?? null,
      isSuperviseur: () => ["superviseur", "admin"].includes(get().user?.role),
      isVendeur: () => get().user?.role === "vendeur",
      isAdmin: () => get().user?.role === "admin",
      getUserId: () => get().user?.id ?? null,
      getUserEmail: () => get().user?.email ?? null,
      getFullName: () => {
        const { user } = get();
        return user ? `${user.prenoms} ${user.nom}` : "";
      },
    }),
    {
      name: "active-user-storage",
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);

export default useActiveUserStore;
