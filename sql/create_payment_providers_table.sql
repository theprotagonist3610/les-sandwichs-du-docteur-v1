-- Table pour stocker les configurations des agrégateurs de paiement
CREATE TABLE IF NOT EXISTS payment_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL UNIQUE, -- 'kkiapay' ou 'feexpay'
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_sandbox BOOLEAN DEFAULT true,
  api_key TEXT, -- Clé API publique
  api_secret TEXT, -- Clé API secrète (chiffrée)
  config JSONB, -- Configuration additionnelle (webhook URLs, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_payment_providers_active ON payment_providers(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_providers_name ON payment_providers(provider_name);

-- Table pour l'historique des transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES payment_providers(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  transaction_id TEXT NOT NULL, -- ID fourni par l'agrégateur
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
  payment_method TEXT, -- 'momo', 'card', etc.
  customer_phone TEXT,
  customer_email TEXT,
  metadata JSONB, -- Données additionnelles
  is_sandbox BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches de transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider ON payment_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_id ON payment_transactions(transaction_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_payment_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_providers_updated_at_trigger
  BEFORE UPDATE ON payment_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_providers_updated_at();

CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at_trigger
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_transactions_updated_at();

-- Insertion des providers par défaut
INSERT INTO payment_providers (provider_name, display_name, is_active, is_sandbox)
VALUES
  ('kkiapay', 'KKiaPay', false, true),
  ('feexpay', 'FeeXpay', false, true),
  ('fedapay', 'FedaPay', false, true)
ON CONFLICT (provider_name) DO NOTHING;

-- Row Level Security (RLS)
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Politique pour payment_providers : seuls les admins peuvent lire et modifier
CREATE POLICY "Admins peuvent tout faire sur payment_providers"
  ON payment_providers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Politique pour payment_transactions : admins et superviseurs peuvent lire
CREATE POLICY "Admins et superviseurs peuvent lire payment_transactions"
  ON payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superviseur')
    )
  );

-- Politique pour payment_transactions : seuls les admins peuvent modifier
CREATE POLICY "Admins peuvent modifier payment_transactions"
  ON payment_transactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE payment_providers IS 'Configuration des agrégateurs de paiement (KKiaPay, FeeXpay)';
COMMENT ON TABLE payment_transactions IS 'Historique des transactions de paiement';
