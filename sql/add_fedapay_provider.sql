-- Script pour ajouter FedaPay aux providers existants
-- Exécuter ce script si vous avez déjà créé la table payment_providers

INSERT INTO payment_providers (provider_name, display_name, is_active, is_sandbox)
VALUES ('fedapay', 'FedaPay', false, true)
ON CONFLICT (provider_name) DO NOTHING;

-- Vérification
SELECT * FROM payment_providers WHERE provider_name = 'fedapay';
