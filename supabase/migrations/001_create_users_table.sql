-- Table des utilisateurs
-- Liée à auth.users de Supabase Auth
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  prenoms VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  sexe VARCHAR(10) NOT NULL CHECK (sexe IN ('Homme', 'Femme', 'Autre')),
  date_naissance DATE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'vendeur' CHECK (role IN ('admin', 'superviseur', 'vendeur')),
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Index pour optimiser les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login_at);

-- Commentaires sur les colonnes
COMMENT ON TABLE public.users IS 'Table des utilisateurs de l''application';
COMMENT ON COLUMN public.users.id IS 'ID utilisateur (référence à auth.users)';
COMMENT ON COLUMN public.users.nom IS 'Nom de famille';
COMMENT ON COLUMN public.users.prenoms IS 'Prénom(s)';
COMMENT ON COLUMN public.users.email IS 'Adresse email unique';
COMMENT ON COLUMN public.users.telephone IS 'Numéro de téléphone au format international';
COMMENT ON COLUMN public.users.sexe IS 'Sexe de l''utilisateur';
COMMENT ON COLUMN public.users.date_naissance IS 'Date de naissance';
COMMENT ON COLUMN public.users.role IS 'Rôle de l''utilisateur (admin, superviseur, vendeur)';
COMMENT ON COLUMN public.users.photo_url IS 'URL de la photo de profil';
COMMENT ON COLUMN public.users.is_active IS 'Indique si le compte est actif (soft delete)';
COMMENT ON COLUMN public.users.last_login_at IS 'Date et heure de la dernière connexion';
