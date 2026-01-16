-- ============================================================================
-- Table: modeDeJeu
-- Description: Gestion des modes de jeu pour "Les Questions du Docteur"
-- ============================================================================

-- Création de la table modeDeJeu
CREATE TABLE IF NOT EXISTS public.modeDeJeu (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode_id VARCHAR(100) UNIQUE NOT NULL, -- Identifiant unique du mode (ex: "classique", "contre-la-montre")

  -- Informations de base
  nom VARCHAR(255) NOT NULL,
  icon VARCHAR(50), -- Emoji ou icône
  description TEXT,
  caracteristiques JSONB DEFAULT '[]'::jsonb, -- Liste des caractéristiques

  -- Type et configuration
  type VARCHAR(50) NOT NULL DEFAULT 'custom', -- 'default', 'custom', 'event'
  configuration JSONB DEFAULT '{}'::jsonb, -- Configuration spécifique au mode
  modes_bases JSONB DEFAULT '[]'::jsonb, -- IDs des modes natifs utilisés comme base (pour customs/events)

  -- Statut
  is_active BOOLEAN DEFAULT true,

  -- Événement (pour les modes temporaires)
  debut_evenement TIMESTAMP WITH TIME ZONE,
  fin_evenement TIMESTAMP WITH TIME ZONE,

  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT valid_type CHECK (type IN ('default', 'custom', 'event')),
  CONSTRAINT valid_event_dates CHECK (
    (type = 'event' AND debut_evenement IS NOT NULL AND fin_evenement IS NOT NULL AND fin_evenement > debut_evenement)
    OR type != 'event'
  )
);

-- ============================================================================
-- INDEX
-- ============================================================================

-- Index sur mode_id pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_mode_de_jeu_mode_id ON public.modeDeJeu(mode_id);

-- Index sur type pour filtrage
CREATE INDEX IF NOT EXISTS idx_mode_de_jeu_type ON public.modeDeJeu(type);

-- Index sur is_active pour récupération des modes actifs
CREATE INDEX IF NOT EXISTS idx_mode_de_jeu_is_active ON public.modeDeJeu(is_active);

-- Index sur les dates d'événement pour les modes temporaires
CREATE INDEX IF NOT EXISTS idx_mode_de_jeu_event_dates
ON public.modeDeJeu(debut_evenement, fin_evenement)
WHERE type = 'event';

-- Index composite pour recherche efficace des modes actifs par type
CREATE INDEX IF NOT EXISTS idx_mode_de_jeu_type_active
ON public.modeDeJeu(type, is_active);

-- ============================================================================
-- FONCTIONS TRIGGERS
-- ============================================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_mode_de_jeu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS trigger_update_mode_de_jeu_updated_at ON public.modeDeJeu;
CREATE TRIGGER trigger_update_mode_de_jeu_updated_at
  BEFORE UPDATE ON public.modeDeJeu
  FOR EACH ROW
  EXECUTE FUNCTION update_mode_de_jeu_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS
ALTER TABLE public.modeDeJeu ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les modes actifs
CREATE POLICY "Modes actifs visibles par tous"
  ON public.modeDeJeu
  FOR SELECT
  USING (is_active = true);

-- Politique: Seuls les admins/superviseurs peuvent créer des modes
CREATE POLICY "Admins peuvent créer des modes"
  ON public.modeDeJeu
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superviseur')
    )
  );

-- Politique: Seuls les admins/superviseurs peuvent modifier des modes
CREATE POLICY "Admins peuvent modifier des modes"
  ON public.modeDeJeu
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superviseur')
    )
  );

-- Politique: Seuls les admins peuvent supprimer des modes
CREATE POLICY "Admins peuvent supprimer des modes"
  ON public.modeDeJeu
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE public.modeDeJeu IS 'Table de gestion des modes de jeu pour Les Questions du Docteur';
COMMENT ON COLUMN public.modeDeJeu.id IS 'Identifiant unique (UUID)';
COMMENT ON COLUMN public.modeDeJeu.mode_id IS 'Identifiant unique du mode (slug)';
COMMENT ON COLUMN public.modeDeJeu.nom IS 'Nom du mode de jeu';
COMMENT ON COLUMN public.modeDeJeu.icon IS 'Emoji ou icône du mode';
COMMENT ON COLUMN public.modeDeJeu.description IS 'Description du mode';
COMMENT ON COLUMN public.modeDeJeu.caracteristiques IS 'Liste des caractéristiques (JSON array)';
COMMENT ON COLUMN public.modeDeJeu.type IS 'Type de mode: default (par défaut), custom (personnalisé), event (événement)';
COMMENT ON COLUMN public.modeDeJeu.configuration IS 'Configuration spécifique au mode (JSON)';
COMMENT ON COLUMN public.modeDeJeu.modes_bases IS 'IDs des modes natifs utilisés comme base pour les modes custom/event (JSON array)';
COMMENT ON COLUMN public.modeDeJeu.is_active IS 'Mode actif ou désactivé';
COMMENT ON COLUMN public.modeDeJeu.debut_evenement IS 'Date de début pour les modes événements';
COMMENT ON COLUMN public.modeDeJeu.fin_evenement IS 'Date de fin pour les modes événements';

-- ============================================================================
-- DONNÉES INITIALES (Modes par défaut)
-- ============================================================================

-- Insertion des modes par défaut (si ils n'existent pas déjà)
INSERT INTO public.modeDeJeu (mode_id, nom, icon, description, caracteristiques, type, configuration, is_active)
VALUES
  (
    'classique',
    'Classique',
    '📚',
    'Quiz standard avec questions aléatoires, sans limite de temps',
    '["Questions aléatoires", "Pas de limite de temps", "Idéal pour l''apprentissage"]'::jsonb,
    'default',
    '{"tempsParQuestion": null, "nombreQuestions": 20, "difficulteAutomatique": false}'::jsonb,
    true
  ),
  (
    'contre-la-montre',
    'Contre-la-Montre',
    '⏱️',
    'Répondez rapidement pour gagner des points bonus',
    '["Temps limité par question", "Points bonus pour rapidité", "Affichage du chronomètre"]'::jsonb,
    'default',
    '{"tempsParQuestion": 30, "bonusRapidite": true, "nombreQuestions": 20}'::jsonb,
    true
  ),
  (
    'survie',
    'Survie',
    '💚',
    '3 vies maximum, une erreur vous coûte une vie',
    '["3 vies maximum", "Une erreur = -1 vie", "Difficulté progressive"]'::jsonb,
    'default',
    '{"viesMax": 3, "difficulteProgressive": true, "tempsParQuestion": 30}'::jsonb,
    true
  ),
  (
    'marathon',
    'Marathon',
    '🏃',
    '50 questions d''affilée sans pause',
    '["50 questions consécutives", "Pas de pause possible", "Classement global"]'::jsonb,
    'default',
    '{"nombreQuestions": 50, "pauseAutorisee": false, "tempsParQuestion": 20}'::jsonb,
    true
  ),
  (
    'thematique',
    'Thématique',
    '🎯',
    'Concentrez-vous sur un thème de santé spécifique',
    '["Choix du thème", "Questions ciblées", "Progression par niveau"]'::jsonb,
    'default',
    '{"themeSelectionnable": true, "nombreQuestions": 20, "progressionNiveau": true}'::jsonb,
    true
  )
ON CONFLICT (mode_id) DO NOTHING;

-- ============================================================================
-- EXEMPLE D'INSERTION D'UN MODE ÉVÉNEMENT
-- ============================================================================

-- Exemple: Mode "Marathon de Noël" actif du 20 au 26 décembre
-- INSERT INTO public.modeDeJeu (mode_id, nom, icon, description, caracteristiques, type, configuration, debut_evenement, fin_evenement, is_active)
-- VALUES (
--   'marathon-noel',
--   'Marathon de Noël',
--   '🎄',
--   'Marathon spécial de Noël avec questions festives',
--   '["100 questions", "Thème de Noël", "Récompenses doublées"]'::jsonb,
--   'event',
--   '{"nombreQuestions": 100, "bonusRecompenses": 2, "theme": "noel"}'::jsonb,
--   '2024-12-20 00:00:00+00',
--   '2024-12-26 23:59:59+00',
--   true
-- );
