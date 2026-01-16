-- Script de création de la table preusers
-- Cette table contient les emails pré-autorisés à créer un compte

-- Supprimer la table si elle existe (ATTENTION: perte de données)
-- DROP TABLE IF EXISTS preusers CASCADE;

-- Créer la table preusers
CREATE TABLE IF NOT EXISTS preusers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'vendeur' CHECK (role IN ('admin', 'superviseur', 'vendeur')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_preusers_email ON preusers(email);

-- Commentaires
COMMENT ON TABLE preusers IS 'Table des emails pré-autorisés à créer un compte';
COMMENT ON COLUMN preusers.email IS 'Email de l''utilisateur pré-autorisé';
COMMENT ON COLUMN preusers.role IS 'Rôle qui sera attribué lors de l''inscription';
COMMENT ON COLUMN preusers.created_by IS 'Administrateur qui a créé cette pré-autorisation';
COMMENT ON COLUMN preusers.notes IS 'Notes optionnelles sur cette pré-autorisation';

-- Activer RLS
ALTER TABLE preusers ENABLE ROW LEVEL SECURITY;

-- Politique de LECTURE PUBLIQUE (SELECT)
-- Permet à TOUT LE MONDE (même non authentifié) de lire la table preusers
-- Nécessaire pour vérifier si un email existe lors de l'inscription
CREATE POLICY "Lecture publique des preusers pour inscription"
ON preusers FOR SELECT
USING (true);

-- Politique de SUPPRESSION PUBLIQUE (DELETE)
-- Permet à TOUT LE MONDE de supprimer un preuser
-- Nécessaire car après inscription, le système supprime automatiquement le preuser
CREATE POLICY "Deletion publique apres inscription"
ON preusers FOR DELETE
USING (true);

-- Politique pour les ADMINS (INSERT, UPDATE)
-- Seuls les admins peuvent créer et modifier des preusers
CREATE POLICY "Admins peuvent creer et modifier preusers"
ON preusers FOR ALL
USING (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Fonction pour nettoyer les preusers expirés (optionnel)
-- Supprime les preusers créés il y a plus de 30 jours
CREATE OR REPLACE FUNCTION cleanup_expired_preusers()
RETURNS void AS $$
BEGIN
  DELETE FROM preusers
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION cleanup_expired_preusers IS 'Supprime les preusers créés il y a plus de 30 jours';

-- Vérification
SELECT 'Table preusers créée avec succès' AS message;
SELECT * FROM preusers LIMIT 5;
