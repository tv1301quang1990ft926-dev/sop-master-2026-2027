/*
# Create SOP Master tracking movements

1. New Tables
- `sop_master_tracking_movements` stores the T-3h odds movement snapshot for each match.
- `match_id` identifies the match.
- `giai_dau` stores the competition name.
- `tran_dau` stores the match display name.
- `handicap_opening` and `handicap_current_t3h` store opening and current Asian handicap lines.
- `odds_home_t3h` and `odds_away_t3h` store current T-3h side odds.
- `overunder_opening` and `overunder_current_t3h` store opening and current totals lines.
- `expected_edge_t3h` stores the calculated expected edge percentage.
- `smart_money_signal` stores the smart-money classification.
- `trap_odds_warning` flags a Rule 5 / E-08 trap warning.
- `update_timestamp_t3h` stores the latest movement timestamp.

2. Security
- Row level security is enabled.
- Anonymous and authenticated clients can read the shared tracking feed.
- No write access is granted to browser clients.

3. Important Notes
- The table is intentionally single-tenant and read-only from the public app.
- The application continues to use local fallback examples when this table is empty or unavailable.
*/

CREATE TABLE IF NOT EXISTS public.sop_master_tracking_movements (
  match_id text PRIMARY KEY,
  giai_dau text NOT NULL,
  tran_dau text NOT NULL,
  handicap_opening numeric,
  handicap_current_t3h numeric,
  odds_home_t3h numeric,
  odds_away_t3h numeric,
  overunder_opening numeric,
  overunder_current_t3h numeric,
  expected_edge_t3h numeric,
  smart_money_signal text,
  trap_odds_warning boolean NOT NULL DEFAULT false,
  update_timestamp_t3h timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sop_master_tracking_movements ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.sop_master_tracking_movements TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read tracking movements" ON public.sop_master_tracking_movements;
CREATE POLICY "Public can read tracking movements"
ON public.sop_master_tracking_movements
FOR SELECT
TO anon, authenticated
USING (true);
