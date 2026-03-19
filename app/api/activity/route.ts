import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveOrSelectedPlanningCycle } from '@/lib/supabase/sortingFrame';

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId') ?? undefined;

  const cycle = await getActiveOrSelectedPlanningCycle(cycleId);
  if (!cycle) {
    return NextResponse.json({ cycleId: null, events: [] });
  }

  const supabase = getSupabaseServerClient();

  // Try activity_events first
  const { data: activityRows } = await supabase
    .from('activity_events')
    .select('id, planning_cycle_id, event_type, message, created_at')
    .eq('planning_cycle_id', cycle.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityRows && activityRows.length > 0) {
    return NextResponse.json({
      cycleId: cycle.id,
      cycleName: cycle.name,
      events: activityRows.map((row: {
        id: string;
        planning_cycle_id: string;
        event_type: string;
        message: string;
        created_at: string;
      }) => ({
        id: row.id,
        eventType: row.event_type,
        message: row.message,
        timestamp: row.created_at,
      })),
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
  }));

  return NextResponse.json({ cycleId: cycle.id, cycleName: cycle.name, events });
}
