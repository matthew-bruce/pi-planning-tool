/**
 * Planning stages — single source of truth.
 *
 * Dispatch exposes six fixed, ordered planning stages. The facilitator sets
 * the current stage from the planning header pill. Stage changes are written
 * to `planning_cycles.current_stage` and emitted as `stage_changed` rows in
 * `activity_events` (no separate history table).
 *
 * IDs are 1..6 and are persisted to the database as a SMALLINT.
 * See: supabase/migrations/20260407000000_planning_cycles_current_stage.sql
 */

export const PLANNING_STAGES = [
  {
    id: 1,
    name: 'Business Context & Vision',
    shortLabel: 'Business Context',
    description:
      'Leaders set the business context, product vision and top objectives for the PI.',
  },
  {
    id: 2,
    name: 'Team Breakouts — Draft Plan',
    shortLabel: 'Draft Plan',
    description:
      'Teams break out to draft their initial plan — features, stories, dependencies, risks.',
  },
  {
    id: 3,
    name: 'Draft Plan Review',
    shortLabel: 'Draft Review',
    description:
      'Teams present draft plans for peer and leadership review and feedback.',
  },
  {
    id: 4,
    name: 'Team Breakouts — Revised Plan',
    shortLabel: 'Revised Plan',
    description:
      'Teams revise their plans based on review feedback and unresolved dependencies.',
  },
  {
    id: 5,
    name: 'Final Plan Review & RoART',
    shortLabel: 'Final Review',
    description:
      'Final plan review, risk acceptance (RoART) and PI objective commitment.',
  },
  {
    id: 6,
    name: 'PI Planning Complete',
    shortLabel: 'Complete',
    description:
      'PI Planning is complete — the committed plan is locked and delivery begins.',
  },
] as const;

export type PlanningStage = (typeof PLANNING_STAGES)[number];
export type PlanningStageId = PlanningStage['id'];

/**
 * Return the stage definition for a given id, or null if the id is null or
 * does not correspond to a known stage.
 */
export function getStageById(id: number | null): PlanningStage | null {
  if (id === null) return null;
  return PLANNING_STAGES.find((stage) => stage.id === id) ?? null;
}

/**
 * Type guard: is the given value a valid stage id (an integer 1..6)?
 * Rejects null, undefined, non-numbers, non-integers and out-of-range values.
 */
export function isValidStageId(id: unknown): id is PlanningStageId {
  return (
    typeof id === 'number' &&
    Number.isInteger(id) &&
    id >= 1 &&
    id <= 6
  );
}
