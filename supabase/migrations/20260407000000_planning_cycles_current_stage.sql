-- ============================================================
-- Planning Stage indicator — add current_stage to planning_cycles
--
-- Adds a nullable SMALLINT column that records the current planning
-- stage (1..6) set by the facilitator from the planning header.
--
-- Stage IDs map to lib/planning/stages.ts:
--   1 = Business Context & Vision
--   2 = Team Breakouts — Draft Plan
--   3 = Draft Plan Review
--   4 = Team Breakouts — Revised Plan
--   5 = Final Plan Review & RoART
--   6 = PI Planning Complete
--
-- Stage transitions are recorded in activity_events (event_type
-- 'stage_changed') — no separate history table.
--
-- Note: planning_cycles will be renamed program_increments in Phase 2.
-- ============================================================

ALTER TABLE planning_cycles
  ADD COLUMN IF NOT EXISTS current_stage smallint;

ALTER TABLE planning_cycles
  DROP CONSTRAINT IF EXISTS planning_cycles_current_stage_check;

ALTER TABLE planning_cycles
  ADD CONSTRAINT planning_cycles_current_stage_check
    CHECK (current_stage IS NULL OR current_stage BETWEEN 1 AND 6);
