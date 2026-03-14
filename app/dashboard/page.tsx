export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { LiveDashboard } from '@/components/dashboard/LiveDashboard';
import { getDashboardData } from '@/lib/supabase/dashboard';

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <LiveDashboard initialData={data} />;
}
