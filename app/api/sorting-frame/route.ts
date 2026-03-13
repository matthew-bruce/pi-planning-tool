import { NextRequest, NextResponse } from 'next/server';
import { getSortingFrameData } from '@/lib/supabase/sortingFrame';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const artId = search.get('artId') ?? undefined;
  const cycleId = search.get('cycleId') ?? undefined;

  const data = await getSortingFrameData({ selectedArtId: artId, selectedCycleId: cycleId });
  return NextResponse.json(data);
}
