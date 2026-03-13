import { getSupabaseServerClient } from '@/lib/supabase/server';
import { GeneratedSprintPreview, PlanningCycle, Sprint } from '@/lib/admin/types';

export async function listPlanningCycles(): Promise<PlanningCycle[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('planning_cycles').select('*').order('start_date', { ascending: false });
  return (data ?? []) as PlanningCycle[];
}

export async function listSprints(): Promise<Sprint[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('sprints').select('*').order('sprint_number', { ascending: true });
  return (data ?? []) as Sprint[];
}

export async function createPlanningCycleWithSprints(payload: {
  cycle: Omit<PlanningCycle, 'id' | 'is_archived'>;
  sprints: GeneratedSprintPreview[];
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { data: cycleData, error: cycleError } = await supabase
    .from('planning_cycles')
    .insert({
      name: payload.cycle.name,
      start_date: payload.cycle.start_date,
      end_date: payload.cycle.end_date,
      sprint_count: payload.cycle.sprint_count,
      sprint_length_days: payload.cycle.sprint_length_days,
      is_active: payload.cycle.is_active,
      is_archived: false,
    })
    .select('*')
    .single();

  if (cycleError || !cycleData) {
    return { error: cycleError?.message ?? 'Could not create planning cycle.' };
  }

  const { error: sprintError } = await supabase.from('sprints').insert(
    payload.sprints.map((sprint) => ({
      planning_cycle_id: cycleData.id,
      sprint_number: sprint.sprint_number,
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
    })),
  );

  if (sprintError) {
    return { error: sprintError.message };
  }

  return { data: cycleData as PlanningCycle };
}

export async function updatePlanningCycle(id: string, updates: Partial<PlanningCycle>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('planning_cycles').update(updates).eq('id', id);
  return { error: error?.message };
}

export async function markCycleActive(cycleId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error: resetError } = await supabase.from('planning_cycles').update({ is_active: false }).neq('id', cycleId);
  if (resetError) return { error: resetError.message };

  const { error } = await supabase.from('planning_cycles').update({ is_active: true, is_archived: false }).eq('id', cycleId);
  return { error: error?.message };
}
