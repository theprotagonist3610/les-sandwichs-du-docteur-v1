import { createClient } from "@supabase/supabase-js";

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Support des deux systèmes : ancien (ANON_KEY) et nouveau (KEY)
// Priorité au nouveau système VITE_SUPABASE_KEY
const supabaseKey =
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifier que les variables d'environnement sont définies
const hasNewKey = !!import.meta.env.VITE_SUPABASE_KEY;
const hasLegacyKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Variables d'environnement Supabase manquantes:");
  if (!supabaseUrl) console.warn("  - VITE_SUPABASE_URL");
  if (!supabaseKey)
    console.warn(
      "  - VITE_SUPABASE_KEY ou VITE_SUPABASE_ANON_KEY (legacy)"
    );
  console.warn(
    "Supabase ne sera pas initialisé correctement. Vérifiez votre fichier .env"
  );
}

// Afficher un avertissement si on utilise l'ancienne clé
if (hasLegacyKey && !hasNewKey) {
  console.warn(
    "⚠️ Vous utilisez VITE_SUPABASE_ANON_KEY (legacy). Migrez vers VITE_SUPABASE_KEY pour la nouvelle API Supabase."
  );
}

// Initialiser le client Supabase
let supabase = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log(
      `✅ Supabase initialisé avec succès (${hasNewKey ? "nouvelle API" : "legacy API"})`
    );
  } else {
    console.warn("⚠️ Supabase non initialisé (variables manquantes)");
  }
} catch (error) {
  console.error("❌ Erreur lors de l'initialisation de Supabase:", error);
}

// Exporter le client
export { supabase };

// Exporter des helpers utiles
export const isSupabaseConfigured = () => {
  return supabase !== null && !!supabaseUrl && !!supabaseKey;
};

// Helper pour vérifier si l'utilisateur est connecté
export const getCurrentUser = async () => {
  if (!supabase) return null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

// Helper pour se déconnecter
export const signOut = async () => {
  if (!supabase) return;

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    throw error;
  }
};
