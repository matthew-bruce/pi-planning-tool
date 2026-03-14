import { NextRequest, NextResponse } from 'next/server';
import { getSortingFrameData } from '@/lib/supabase/sortingFrame';

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const selectedArtId = search.get('selectedArtId') ?? undefined;
  const selectedCycleId = search.get('selectedCycleId') ?? undefined;

  const data = await getSortingFrameData({
    selectedArtId,
    selectedCycleId,
  });

  return NextResponse.json(data);
}
