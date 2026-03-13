import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/supabase/dashboard';

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get('cycleId') ?? undefined;
  const artId = request.nextUrl.searchParams.get('artId') ?? undefined;
  const data = await getDashboardData({ selectedCycleId: cycleId, selectedArtId: artId });
  return NextResponse.json(data);
}
