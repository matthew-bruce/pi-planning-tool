-- ============================================================
-- Phase 1 Additive Schema Changes (Audit)
-- Date: 2026-03-17
-- Additive only — new columns and new tables. No renames or removals.
-- ============================================================


-- ============================================================
-- 1. dependencies: add source_feature_id and target_feature_id (nullable UUID refs)
-- ============================================================
ALTER TABLE dependencies
  ADD COLUMN IF NOT EXISTS source_feature_id uuid REFERENCES features(id),
  ADD COLUMN IF NOT EXISTS target_feature_id uuid REFERENCES features(id);


-- ============================================================
-- 2. features: add source_key (stable ID from ADO/Jira, nullable)
-- ============================================================
ALTER TABLE features
  ADD COLUMN IF NOT EXISTS source_key text;


-- ============================================================
-- 3. stories: add source_key (stable ID from ADO/Jira, nullable)
-- ============================================================
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS source_key text;


-- ============================================================
-- 4 & 5. planning_cycles: add current_stage and is_archived
-- ============================================================
ALTER TABLE planning_cycles
  ADD COLUMN IF NOT EXISTS current_stage integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_archived   boolean NOT NULL DEFAULT false;


-- ============================================================
-- 6. planning_cycles: make end_date NOT NULL (safe — 0 null rows confirmed)
-- ============================================================
ALTER TABLE planning_cycles
  ALTER COLUMN end_date SET NOT NULL;


-- ============================================================
-- 7. planning_cycles: add updated_at
-- ============================================================
ALTER TABLE planning_cycles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- ============================================================
-- 8 & 9. import_snapshots: add created_at and updated_at
-- ============================================================
ALTER TABLE import_snapshots
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- ============================================================
-- 10 & 11. arts: add updated_at and short_name
-- ============================================================
ALTER TABLE arts
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS short_name  text;


-- ============================================================
-- 12 & 13. arts: set short_name for existing ARTs
-- ============================================================
UPDATE arts SET short_name = 'WAA' WHERE name = 'Web & App';
UPDATE arts SET short_name = 'OOH' WHERE name = 'Out Of Home';


-- ============================================================
-- 14. arts: insert Customer Relationship Management (CRM)
-- ============================================================
INSERT INTO arts (name, short_name, is_active)
VALUES ('Customer Relationship Management', 'CRM', true)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 15. initiatives: add updated_at
-- ============================================================
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- ============================================================
-- 16 & 17. teams: add updated_at and team_type with CHECK constraint
-- ============================================================
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS team_type  text        NOT NULL DEFAULT 'stream-aligned'
    CONSTRAINT teams_team_type_check
      CHECK (team_type IN ('stream-aligned', 'platform', 'enabling', 'complicated-subsystem'));


-- ============================================================
-- 18. teams: explicitly set all existing rows to stream-aligned
-- ============================================================
UPDATE teams SET team_type = 'stream-aligned';


-- ============================================================
-- 19. features: expand source_system CHECK to include 'manual', add DEFAULT
-- ============================================================
ALTER TABLE features
  DROP CONSTRAINT IF EXISTS features_source_system_check;
ALTER TABLE features
  ADD CONSTRAINT features_source_system_check
    CHECK (source_system = ANY (ARRAY['ADO', 'JIRA', 'DEMO', 'CSV', 'manual']));
ALTER TABLE features
  ALTER COLUMN source_system SET DEFAULT 'manual';


-- ============================================================
-- 20. stories: expand source_system CHECK to include 'manual', add DEFAULT
-- ============================================================
ALTER TABLE stories
  DROP CONSTRAINT IF EXISTS stories_source_system_check;
ALTER TABLE stories
  ADD CONSTRAINT stories_source_system_check
    CHECK (source_system = ANY (ARRAY['ADO', 'JIRA', 'DEMO', 'CSV', 'manual']));
ALTER TABLE stories
  ALTER COLUMN source_system SET DEFAULT 'manual';


-- ============================================================
-- 21. activity_events: make planning_cycle_id NOT NULL (safe — 0 rows confirmed)
-- ============================================================
ALTER TABLE activity_events
  ALTER COLUMN planning_cycle_id SET NOT NULL;


-- ============================================================
-- 22. Create app_settings table
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text        NOT NULL UNIQUE,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 23. Create team_art_assignments table
-- ============================================================
CREATE TABLE IF NOT EXISTS team_art_assignments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_cycle_id uuid        NOT NULL REFERENCES planning_cycles(id),
  team_id           uuid        NOT NULL REFERENCES teams(id),
  art_id            uuid        NOT NULL REFERENCES arts(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (planning_cycle_id, team_id, art_id)
);


-- ============================================================
-- 24. Add indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_features_planning_cycle_id      ON features(planning_cycle_id);
CREATE INDEX IF NOT EXISTS idx_features_ticket_key             ON features(ticket_key);
CREATE INDEX IF NOT EXISTS idx_stories_feature_id              ON stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_stories_planning_cycle_id       ON stories(planning_cycle_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_planning_cycle_id  ON dependencies(planning_cycle_id);
CREATE INDEX IF NOT EXISTS idx_sprints_planning_cycle_id       ON sprints(planning_cycle_id);
