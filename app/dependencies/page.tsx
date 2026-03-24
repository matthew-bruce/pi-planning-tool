export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getDependenciesData } from '@/lib/supabase/dependencies';
import { DependenciesGraph } from '@/components/dependencies/DependenciesGraph';

export default async function DependenciesPage({
  searchParams,
}: {
  searchParams: { artId?: string };
}) {
  const artId =
    searchParams.artId && searchParams.artId !== 'all'
      ? searchParams.artId
      : undefined;

  const data = await getDependenciesData(artId);

  return <DependenciesGraph initialData={data} />;
}
