-- Template SQL pour créer un premier emplacement
-- Remplacez les valeurs entre <> par vos propres données

-- 1. Vérifier d'abord qu'un utilisateur admin/superviseur existe pour être responsable
-- SELECT id, nom, prenoms, role FROM users WHERE role IN ('admin', 'superviseur');

-- 2. Insérer un emplacement de type "base" (entrepôt principal)
INSERT INTO emplacements (
  nom,
  type,
  adresse,
  responsable_id,
  horaires,
  statut
) VALUES (
  'Base Principale - Cotonou',
  'base',
  '{
    "departement": "Atlantique",
    "commune": "Cotonou",
    "arrondissement": "1er arrondissement",
    "quartier": "Ganhi",
    "localisation": {
      "lat": 6.3654,
      "lng": 2.4183
    }
  }'::jsonb,
  '<ID_DU_RESPONSABLE>', -- Remplacer par l'UUID d'un utilisateur admin/superviseur
  '{
    "lundi": {"ouverture": "08:00", "fermeture": "18:00"},
    "mardi": {"ouverture": "08:00", "fermeture": "18:00"},
    "mercredi": {"ouverture": "08:00", "fermeture": "18:00"},
    "jeudi": {"ouverture": "08:00", "fermeture": "18:00"},
    "vendredi": {"ouverture": "08:00", "fermeture": "18:00"},
    "samedi": {"ouverture": "08:00", "fermeture": "14:00"},
    "dimanche": {"ouverture": null, "fermeture": null}
  }'::jsonb,
  'actif'
);

-- 3. Insérer un stand sur un marché
INSERT INTO emplacements (
  nom,
  type,
  adresse,
  responsable_id,
  horaires,
  statut
) VALUES (
  'Stand Marché Dantokpa',
  'stand',
  '{
    "departement": "Atlantique",
    "commune": "Cotonou",
    "arrondissement": "1er arrondissement",
    "quartier": "Dantokpa",
    "localisation": {
      "lat": 6.3563,
      "lng": 2.4382
    }
  }'::jsonb,
  '<ID_DU_RESPONSABLE>',
  '{
    "lundi": {"ouverture": "07:00", "fermeture": "19:00"},
    "mardi": {"ouverture": "07:00", "fermeture": "19:00"},
    "mercredi": {"ouverture": "07:00", "fermeture": "19:00"},
    "jeudi": {"ouverture": "07:00", "fermeture": "19:00"},
    "vendredi": {"ouverture": "07:00", "fermeture": "19:00"},
    "samedi": {"ouverture": "07:00", "fermeture": "20:00"},
    "dimanche": {"ouverture": "07:00", "fermeture": "14:00"}
  }'::jsonb,
  'actif'
);

-- 4. Insérer un kiosque
INSERT INTO emplacements (
  nom,
  type,
  adresse,
  responsable_id,
  horaires,
  statut
) VALUES (
  'Kiosque Fidjrossè',
  'kiosque',
  '{
    "departement": "Atlantique",
    "commune": "Cotonou",
    "arrondissement": "13ème arrondissement",
    "quartier": "Fidjrossè",
    "localisation": {
      "lat": 6.3771,
      "lng": 2.3904
    }
  }'::jsonb,
  '<ID_DU_RESPONSABLE>',
  '{
    "lundi": {"ouverture": "09:00", "fermeture": "21:00"},
    "mardi": {"ouverture": "09:00", "fermeture": "21:00"},
    "mercredi": {"ouverture": "09:00", "fermeture": "21:00"},
    "jeudi": {"ouverture": "09:00", "fermeture": "21:00"},
    "vendredi": {"ouverture": "09:00", "fermeture": "22:00"},
    "samedi": {"ouverture": "09:00", "fermeture": "22:00"},
    "dimanche": {"ouverture": "10:00", "fermeture": "20:00"}
  }'::jsonb,
  'actif'
);

-- 5. Insérer une boutique
INSERT INTO emplacements (
  nom,
  type,
  adresse,
  responsable_id,
  horaires,
  statut
) VALUES (
  'Boutique Akpakpa',
  'boutique',
  '{
    "departement": "Atlantique",
    "commune": "Cotonou",
    "arrondissement": "3ème arrondissement",
    "quartier": "Akpakpa",
    "localisation": {
      "lat": 6.3488,
      "lng": 2.4489
    }
  }'::jsonb,
  NULL, -- Pas de responsable assigné pour l'instant
  '{
    "lundi": {"ouverture": "08:00", "fermeture": "20:00"},
    "mardi": {"ouverture": "08:00", "fermeture": "20:00"},
    "mercredi": {"ouverture": "08:00", "fermeture": "20:00"},
    "jeudi": {"ouverture": "08:00", "fermeture": "20:00"},
    "vendredi": {"ouverture": "08:00", "fermeture": "20:00"},
    "samedi": {"ouverture": "08:00", "fermeture": "20:00"},
    "dimanche": {"ouverture": null, "fermeture": null}
  }'::jsonb,
  'actif'
);

-- 6. Insérer un emplacement sans coordonnées GPS (ne sera pas visible sur la carte)
INSERT INTO emplacements (
  nom,
  type,
  adresse,
  responsable_id,
  horaires,
  statut
) VALUES (
  'Stand Provisoire - Cadjehoun',
  'stand',
  '{
    "departement": "Atlantique",
    "commune": "Cotonou",
    "arrondissement": "5ème arrondissement",
    "quartier": "Cadjehoun",
    "localisation": {
      "lat": null,
      "lng": null
    }
  }'::jsonb,
  '<ID_DU_RESPONSABLE>',
  '{
    "lundi": {"ouverture": "07:00", "fermeture": "18:00"},
    "mardi": {"ouverture": "07:00", "fermeture": "18:00"},
    "mercredi": {"ouverture": "07:00", "fermeture": "18:00"},
    "jeudi": {"ouverture": "07:00", "fermeture": "18:00"},
    "vendredi": {"ouverture": "07:00", "fermeture": "18:00"},
    "samedi": {"ouverture": "07:00", "fermeture": "14:00"},
    "dimanche": {"ouverture": null, "fermeture": null}
  }'::jsonb,
  'ferme_temporairement'
);

-- 7. Vérifier les emplacements créés
SELECT
  id,
  nom,
  type,
  statut,
  adresse->>'quartier' as quartier,
  adresse->>'commune' as commune,
  adresse->'localisation'->>'lat' as latitude,
  adresse->'localisation'->>'lng' as longitude,
  created_at
FROM emplacements
ORDER BY created_at DESC;

-- Notes importantes:
--
-- Types d'emplacements disponibles:
--   - 'base': Entrepôt/Base principale
--   - 'stand': Stand sur un marché
--   - 'kiosque': Kiosque mobile ou semi-permanent
--   - 'boutique': Boutique fixe
--
-- Statuts disponibles:
--   - 'actif': Emplacement opérationnel
--   - 'inactif': Emplacement désactivé
--   - 'ferme_temporairement': Emplacement temporairement fermé
--
-- Format des horaires:
--   - Utiliser le format HH:MM (24h)
--   - null pour les jours de fermeture
--
-- Coordonnées GPS:
--   - lat: Latitude (exemple: 6.3654 pour Cotonou)
--   - lng: Longitude (exemple: 2.4183 pour Cotonou)
--   - Mettre null si pas encore défini (l'emplacement n'apparaîtra pas sur la carte)
