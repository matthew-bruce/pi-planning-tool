'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Feature } from '@/lib/models';
import { FeatureCard } from '@/components/FeatureCard';

export function ParkingLotDrawer({ features }: { features: Feature[] }) {
  const { setNodeRef } = useDroppable({ id: 'parking-lot' });

  return (
    <aside ref={setNodeRef} className="w-80 shrink-0 border-l border-gray-200 bg-gray-50 p-3 overflow-y-auto">
      <h3 className="font-semibold mb-2">Parking Lot</h3>
      <p className="text-xs text-gray-500 mb-3">Unallocated features ({features.length})</p>
      <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </SortableContext>
    </aside>
  );
}
