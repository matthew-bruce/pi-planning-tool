'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Feature, Sprint } from '@/lib/models';
import { formatSprintRange } from '@/lib/utils';
import { FeatureCard } from '@/components/FeatureCard';

type SprintColumnProps = {
  sprint: Sprint;
  features: Feature[];
};

export function SprintColumn({ sprint, features }: SprintColumnProps) {
  const { setNodeRef } = useDroppable({ id: sprint.id });

  const sprintLabel = sprint.name ?? `Sprint ${sprint.number}`;

  return (
    <div
      ref={setNodeRef}
      className="min-w-64 rounded border border-gray-200 bg-white p-2"
    >
      <h4 className="font-semibold">{sprintLabel}</h4>

      <p className="mb-2 text-xs text-gray-500">
        {formatSprintRange(sprint.startDate, sprint.endDate)}
      </p>

      <SortableContext
        items={features.map((feature) => feature.id)}
        strategy={verticalListSortingStrategy}
      >
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </SortableContext>
    </div>
  );
}
