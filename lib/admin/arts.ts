import { Art } from '@/lib/admin/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function listArts(): Promise<Art[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from('arts').select('*').order('display_order', { ascending: true }).order('name');
  return (data ?? []) as Art[];
}

export async function createArt(name: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('arts').insert({ name, is_active: true });
  return { error: error?.message };
}

export async function updateArt(id: string, updates: Partial<Art>) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { error } = await supabase.from('arts').update(updates).eq('id', id);
  return { error: error?.message };
}

export async function reorderArts(orderedIds: string[]) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { error: 'Supabase is not configured.' };
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('arts')
      .update({ display_order: i + 1 })
      .eq('id', orderedIds[i]);
    if (error) return { error: error.message };
  }
  return { error: undefined };
}
