import { Initiative } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function listInitiatives(): Promise<Initiative[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('initiatives').select('*').order('name');
  return (data ?? []) as Initiative[];
}

export async function createInitiative(payload: {
  name: string;
  art_id: string | null;
  planning_cycle_id: string | null;
  is_active: boolean;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('initiatives').insert(payload);
  return { error: error?.message };
}

export async function updateInitiative(id: string, updates: Partial<Initiative>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('initiatives').update(updates).eq('id', id);
  return { error: error?.message };
}
