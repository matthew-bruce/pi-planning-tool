export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { DependenciesGraph } from '@/components/dependencies/DependenciesGraph';
import { getDependenciesData } from '@/lib/supabase/dependencies';

type Props = {
  searchParams: Promise<{ artId?: string }>;
};

export default async function DependenciesPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await getDependenciesData({ selectedArtId: params.artId });
  return <DependenciesGraph initialData={data} />;
}
