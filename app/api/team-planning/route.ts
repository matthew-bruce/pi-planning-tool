import { NextRequest, NextResponse } from 'next/server';
import { getTeamPlanningData } from '@/lib/supabase/teamPlanning';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const selectedArtId = search.get('selectedArtId') ?? undefined;
  const selectedCycleId = search.get('selectedCycleId') ?? undefined;

  const data = await getTeamPlanningData({ selectedArtId, selectedCycleId });

  return NextResponse.json(data);
}
