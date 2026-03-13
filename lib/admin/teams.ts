import { Team, TeamCycleParticipation } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function listTeams(): Promise<Team[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('teams').select('*').order('name');
  return (data ?? []) as Team[];
}

export async function createTeam(payload: { name: string; platform_id: string | null }) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('teams').insert({ ...payload, is_active: true });
  return { error: error?.message };
}

export async function updateTeam(id: string, updates: Partial<Team>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('teams').update(updates).eq('id', id);
  return { error: error?.message };
}

export async function listTeamCycleParticipation(cycleId: string): Promise<TeamCycleParticipation[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase || !cycleId) return [];
  const { data } = await supabase.from('team_cycle_participation').select('*').eq('planning_cycle_id', cycleId);
  return (data ?? []) as TeamCycleParticipation[];
}

export async function upsertTeamCycleParticipation(payload: {
  planning_cycle_id: string;
  team_id: string;
  is_participating: boolean;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };

  const { error } = await supabase.from('team_cycle_participation').upsert(payload, {
    onConflict: 'planning_cycle_id,team_id',
  });

  return { error: error?.message };
}

export async function listAllTeamCycleParticipation(): Promise<TeamCycleParticipation[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('team_cycle_participation').select('*');
  return (data ?? []) as TeamCycleParticipation[];
}
