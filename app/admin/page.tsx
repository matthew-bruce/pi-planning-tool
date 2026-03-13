import { AdminControlCentre } from '@/components/admin/AdminControlCentre';
import { getAdminBootstrapData } from '@/lib/admin/bootstrap';

export default async function AdminPage() {
  const data = await getAdminBootstrapData();
  return <AdminControlCentre {...data} />;
}
