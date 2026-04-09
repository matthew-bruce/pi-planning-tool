import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Shared Program Increment row type used by all planning-page fetchers.
 *
 * Note: the underlying table is still `planning_cycles` — it will be renamed
 * to `program_increments` in Phase 2. The TypeScript type leads the rename.
 */
export type ProgramIncrementRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_archived: boolean;
  current_stage: number | null;
};

const PI_COLUMNS =
  'id,name,start_date,end_date,is_active,is_archived,current_stage';

/**
 * Resolve the Program Increment to use for a request.
 *
 * Priority:
 *   1. The explicit `selectedCycleId` if provided and found
 *   2. The most recently started cycle marked `is_active = true`
 *   3. The most recently started cycle of any kind (fallback)
 *   4. `null` if no cycles exist at all
 *
 * Extracted from the per-page fetchers in `lib/supabase/*.ts` so that every
 * planning page shares the same resolution rules and returns the same row
 * shape — including `current_stage` for the Planning Stage pill in the header.
 */
export async function getActiveOrSelectedProgramIncrement(
  selectedCycleId?: string,
): Promise<ProgramIncrementRow | null> {
  const supabase = getSupabaseServerClient();

  if (selectedCycleId) {
    const { data } = await supabase
      .from('planning_cycles')
      .select(PI_COLUMNS)
      .eq('id', selectedCycleId)
      .maybeSingle();

    if (data) return data as ProgramIncrementRow;
  }

  const { data: active } = await supabase
    .from('planning_cycles')
    .select(PI_COLUMNS)
    .eq('is_active', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) return active as ProgramIncrementRow;

  const { data: latest } = await supabase
    .from('planning_cycles')
    .select(PI_COLUMNS)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latest as ProgramIncrementRow | null) ?? null;
}
