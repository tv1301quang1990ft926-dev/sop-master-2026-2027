/*
# Create sop_master_baseline_scans table (single-tenant, no auth)

## Purpose
Stores the daily scraper output for SOP Master GĐ1 baseline scans. Each row
represents one unique match (deduplicated by match_id across 4 data portals).
The scraper writes top-level columns plus a `baseline_payload` JSONB blob
containing odds, xG, H2H history, and cross-check metadata.

## New Table: sop_master_baseline_scans
- match_id (text, primary key) — unique slug like "20261107_manutd_liverpool"
- match_date (timestamptz) — ISO kickoff timestamp
- league_name (text) — tournament/competition name
- home_team (text) — home club name
- away_team (text) — away club name
- baseline_payload (jsonb) — nested blob with odds, xG, h2h_history, consensus

## Security
- Enable RLS on the table.
- Grant CRUD to anon + authenticated (single-tenant app, no sign-in screen).
- All policies use USING(true) / WITH CHECK(true) because the data is
  intentionally public/shared — the app has no login and all match data
  is visible to every visitor.

## Notes
- The Python daily_scraper.py writes to this table via upsert on
  (match_id, match_date, league_name, home_team, away_team, baseline_payload).
- The frontend reads from this table to populate the GĐ1 MatchBoard.
*/

CREATE TABLE IF NOT EXISTS sop_master_baseline_scans (
  match_id text PRIMARY KEY,
  match_date timestamptz,
  league_name text,
  home_team text,
  away_team text,
  baseline_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sop_master_baseline_scans ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sop_master_baseline_scans TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_baseline_scans" ON sop_master_baseline_scans;
CREATE POLICY "anon_select_baseline_scans"
  ON sop_master_baseline_scans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_baseline_scans" ON sop_master_baseline_scans;
CREATE POLICY "anon_insert_baseline_scans"
  ON sop_master_baseline_scans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_baseline_scans" ON sop_master_baseline_scans;
CREATE POLICY "anon_update_baseline_scans"
  ON sop_master_baseline_scans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_baseline_scans" ON sop_master_baseline_scans;
CREATE POLICY "anon_delete_baseline_scans"
  ON sop_master_baseline_scans FOR DELETE
  TO anon, authenticated USING (true);
