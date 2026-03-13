import { SortingFrameBoard } from '@/components/sorting-frame/SortingFrameBoard';
import { getSortingFrameData } from '@/lib/supabase/sortingFrame';

export default async function SortingFramePage() {
  const data = await getSortingFrameData({});
  return <SortingFrameBoard initialData={data} />;
}
