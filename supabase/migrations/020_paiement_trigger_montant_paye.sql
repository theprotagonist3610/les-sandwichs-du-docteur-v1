-- Migration 020 — Trigger : mise à jour automatique de montant_paye sur tournées
--
-- Lorsqu'un paiement est inséré dans paiements_ristourne, le montant est
-- distribué sur les tournées impayées/partielles du distributeur (plus
-- anciennes en premier). En cas de suppression, tout est recalculé depuis
-- zéro en rejouant les paiements restants.
--
-- Les fonctions utilisent SECURITY DEFINER pour contourner les RLS sur
-- tournees_distribution (nécessaire quand l'appelant n'est pas admin).

-- ─── 1. Calcul du statut ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calc_statut_paiement(
  p_montant_paye  NUMERIC,
  p_ristourne_due NUMERIC
)
RETURNS statut_paiement_enum
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF    p_ristourne_due  <= 0                   THEN RETURN 'paye';
  ELSIF p_montant_paye   <= 0                   THEN RETURN 'non_paye';
  ELSIF p_montant_paye   >= p_ristourne_due      THEN RETURN 'paye';
  ELSE                                               RETURN 'partiel';
  END IF;
END;
$$;

-- ─── 2. Distribuer un montant sur les tournées ouvertes d'un distributeur ─────

CREATE OR REPLACE FUNCTION distribute_paiement(
  p_id_distributeur UUID,
  p_montant         NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  reste     NUMERIC := p_montant;
  t         RECORD;
  a_payer   NUMERIC;
  versement NUMERIC;
  nouveau   NUMERIC;
BEGIN
  FOR t IN
    SELECT id, ristourne_due, montant_paye
    FROM   tournees_distribution
    WHERE  id_distributeur = p_id_distributeur
      AND  ristourne_due   > 0
      AND  statut_paiement != 'paye'
    ORDER  BY date_tournee ASC, created_at ASC
  LOOP
    EXIT WHEN reste <= 0;

    a_payer   := t.ristourne_due - t.montant_paye;
    versement := LEAST(reste, a_payer);
    nouveau   := t.montant_paye + versement;

    UPDATE tournees_distribution
    SET    montant_paye    = nouveau,
           statut_paiement = calc_statut_paiement(nouveau, t.ristourne_due)
    WHERE  id = t.id;

    reste := reste - versement;
  END LOOP;
END;
$$;

-- ─── 3. Recalculer tous les montants d'un distributeur depuis zéro ────────────
-- Utilisé après suppression d'un paiement.

CREATE OR REPLACE FUNCTION recalculate_montant_paye(p_id_distributeur UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  p RECORD;
BEGIN
  -- Reset : toutes les tournées à 0, statut selon ristourne_due
  UPDATE tournees_distribution
  SET    montant_paye    = 0,
         statut_paiement = calc_statut_paiement(0, ristourne_due)
  WHERE  id_distributeur = p_id_distributeur;

  -- Rejouer les paiements restants dans l'ordre chronologique
  FOR p IN
    SELECT montant
    FROM   paiements_ristourne
    WHERE  id_distributeur = p_id_distributeur
    ORDER  BY date_paiement ASC, created_at ASC
  LOOP
    PERFORM distribute_paiement(p_id_distributeur, p.montant);
  END LOOP;
END;
$$;

-- ─── 4. Fonctions trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_fn_paiement_insert()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  PERFORM distribute_paiement(NEW.id_distributeur, NEW.montant);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_fn_paiement_delete()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  PERFORM recalculate_montant_paye(OLD.id_distributeur);
  RETURN OLD;
END;
$$;

-- ─── 5. Triggers ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_paiement_insert ON paiements_ristourne;
DROP TRIGGER IF EXISTS trg_paiement_delete ON paiements_ristourne;

CREATE TRIGGER trg_paiement_insert
  AFTER INSERT ON paiements_ristourne
  FOR EACH ROW EXECUTE FUNCTION trg_fn_paiement_insert();

CREATE TRIGGER trg_paiement_delete
  AFTER DELETE ON paiements_ristourne
  FOR EACH ROW EXECUTE FUNCTION trg_fn_paiement_delete();
