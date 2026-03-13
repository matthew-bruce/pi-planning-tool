'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Feature, Sprint } from '@/lib/models';
import { formatSprintRange } from '@/lib/utils';
import { FeatureCard } from '@/components/FeatureCard';

export function SprintColumn({ sprint, features }: { sprint: Sprint; features: Feature[] }) {
  const { setNodeRef } = useDroppable({ id: sprint.id });
  return (
    <div ref={setNodeRef} className="min-w-64 bg-gray-50 border border-gray-200 rounded p-2">
      <h4 className="font-semibold">{sprint.name ?? `Sprint ${sprint.number}`}</h4>
      <p className="text-xs text-gray-500 mb-2">{formatSprintRange(sprint.startDate, sprint.endDate)}</p>
      <SortableContext items={features.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </SortableContext>
    </div>
  );
}
