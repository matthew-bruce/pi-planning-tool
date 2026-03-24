export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { TeamPlanningBoard } from '@/components/team-planning/TeamPlanningBoard';
import { getTeamPlanningData } from '@/lib/supabase/teamPlanning';

export default async function TeamPlanningPage() {
  const data = await getTeamPlanningData({});
  return <TeamPlanningBoard initialData={data} />;
}
