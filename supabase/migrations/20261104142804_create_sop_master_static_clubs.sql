/*
# Create sop_master_static_clubs table

Plain-English summary: stores the static list of clubs shown in the SOP Master 2026-2027 app.

1. New Tables
- `sop_master_static_clubs`
  - `id` (uuid, primary key, auto-generated)
  - `name` (text, required) - display name of the club
  - `category` (text, optional) - grouping label such as sports or arts
  - `description` (text, optional) - short description of the club
  - `created_at` (timestamptz, defaults to now)

2. Security
- Row Level Security enabled on `sop_master_static_clubs`.
- No sign-in exists in this app, so the anon and authenticated roles get SELECT, INSERT, UPDATE, DELETE.
- Policies are intentionally public because the data is shared across the app.

3. Important notes
- Idempotent: safe to re-run; uses IF NOT EXISTS and DROP POLICY IF EXISTS.
*/

CREATE TABLE IF NOT EXISTS sop_master_static_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sop_master_static_clubs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sop_master_static_clubs TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_sop_master_static_clubs" ON sop_master_static_clubs;
CREATE POLICY "anon_select_sop_master_static_clubs" ON sop_master_static_clubs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sop_master_static_clubs" ON sop_master_static_clubs;
CREATE POLICY "anon_insert_sop_master_static_clubs" ON sop_master_static_clubs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sop_master_static_clubs" ON sop_master_static_clubs;
CREATE POLICY "anon_update_sop_master_static_clubs" ON sop_master_static_clubs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sop_master_static_clubs" ON sop_master_static_clubs;
CREATE POLICY "anon_delete_sop_master_static_clubs" ON sop_master_static_clubs FOR DELETE
  TO anon, authenticated USING (true);
