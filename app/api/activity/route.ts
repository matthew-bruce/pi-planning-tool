import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrSelectedPlanningCycle } from '@/lib/supabase/sortingFrame';

type RawEvent = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
  team_id: string | null;
  art_id: string | null;
  initiative_id: string | null;
};

type RawTeam = {
  id: string;
  name: string;
  platforms: Array<{ name: string }> | null;
};

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId') ?? undefined;

  const cycle = await getActiveOrSelectedPlanningCycle(cycleId);
  if (!cycle) {
    return NextResponse.json({
      cycleId: null,
      events: [],
      meta: { teams: [], arts: [], initiatives: [] },
    });
  }

  const supabase = getSupabaseServerClient();

  // Try activity_events first
  const { data: activityRows } = await supabase
    .from('activity_events')
    .select('id, event_type, message, created_at, team_id, art_id, initiative_id')
    .eq('planning_cycle_id', cycle.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (activityRows && activityRows.length > 0) {
    const rows = activityRows as RawEvent[];

    // Collect unique IDs for meta lookups
    const teamIds = [...new Set(rows.map((r) => r.team_id).filter((id): id is string => id !== null))];
    const artIds = [...new Set(rows.map((r) => r.art_id).filter((id): id is string => id !== null))];
    const initiativeIds = [...new Set(rows.map((r) => r.initiative_id).filter((id): id is string => id !== null))];

    const [teamsRes, artsRes, initiativesRes] = await Promise.all([
      teamIds.length
        ? supabase.from('teams').select('id, name, platforms(name)').in('id', teamIds)
        : Promise.resolve({ data: [] }),
      artIds.length
        ? supabase.from('arts').select('id, name').in('id', artIds)
        : Promise.resolve({ data: [] }),
      initiativeIds.length
        ? supabase.from('initiatives').select('id, name').in('id', initiativeIds)
        : Promise.resolve({ data: [] }),
    ]);

    const teamsData = (teamsRes.data ?? []) as RawTeam[];
    const artsData = (artsRes.data ?? []) as Array<{ id: string; name: string }>;
    const initiativesData = (initiativesRes.data ?? []) as Array<{ id: string; name: string }>;

    return NextResponse.json({
      cycleId: cycle.id,
      cycleName: cycle.name,
      events: rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        message: row.message,
        timestamp: row.created_at,
        teamId: row.team_id,
        artId: row.art_id,
        initiativeId: row.initiative_id,
      })),
      meta: {
        teams: teamsData.map((t) => ({
          id: t.id,
          name: t.name,
          platform: t.platforms?.[0]?.name ?? null,
        })),
        arts: artsData,
        initiatives: initiativesData,
      },
    });
  }

  // Fall back to import_snapshots as synthetic events
  const { data: snapshots } = await supabase
    .from('import_snapshots')
    .select('id, imported_at, source_system, file_name, status')
    .eq('planning_cycle_id', cycle.id)
    .order('imported_at', { ascending: false })
    .limit(50);

  const events = ((snapshots ?? []) as Array<{
    id: string;
    imported_at: string;
    source_system: string | null;
    file_name: string | null;
    status: string;
  }>).map((row) => ({
    id: row.id,
    eventType: row.status === 'rolled_back' ? 'SNAPSHOT_ROLLED_BACK' : 'SNAPSHOT_IMPORTED',
    message: `${row.file_name ?? 'Snapshot'} (${row.source_system ?? 'CSV'})`,
    timestamp: row.imported_at,
    teamId: null as string | null,
    artId: null as string | null,
    initiativeId: null as string | null,
  }));

  return NextResponse.json({
    cycleId: cycle.id,
    cycleName: cycle.name,
    events,
    meta: { teams: [], arts: [], initiatives: [] },
  });
}
