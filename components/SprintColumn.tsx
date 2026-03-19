'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Feature, Sprint } from '@/lib/models';
import { formatSprintRange } from '@/lib/utils';
import { FeatureCard } from '@/components/FeatureCard';

type SprintColumnProps = {
  sprint: Sprint;
  features: Feature[];
  searchTerm?: string;
  showHeader?: boolean;
};

export function SprintColumn({ sprint, features, searchTerm, showHeader = true }: SprintColumnProps) {
  const { setNodeRef } = useDroppable({ id: sprint.id });

  const sprintLabel = sprint.name ?? `Sprint ${sprint.number}`;

  return (
    <div
      ref={setNodeRef}
      className="w-64 shrink-0 rounded border border-gray-200 bg-white p-2"
    >
      {showHeader && (
        <>
          <h4 className="font-semibold">{sprintLabel}</h4>
          <p className="mb-2 text-xs text-gray-500">
            {formatSprintRange(sprint.startDate, sprint.endDate)}
          </p>
        </>
      )}

      <SortableContext
        items={features.map((feature) => feature.id)}
        strategy={verticalListSortingStrategy}
      >
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} searchTerm={searchTerm} />
        ))}
      </SortableContext>
    </div>
  );
}
