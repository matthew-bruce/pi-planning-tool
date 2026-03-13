import { Platform } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function listPlatforms(): Promise<Platform[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('platforms').select('*').order('name');
  return (data ?? []) as Platform[];
}

export async function createPlatform(name: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('platforms').insert({ name, is_active: true });
  return { error: error?.message };
}

export async function updatePlatform(id: string, updates: Partial<Platform>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('platforms').update(updates).eq('id', id);
  return { error: error?.message };
}
