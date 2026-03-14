'use client';

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Feature } from '@/lib/models';

type FeatureCardProps = {
  feature: Feature;
};

export function FeatureCard({ feature }: FeatureCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: feature.id,
      data: { featureId: feature.id },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      <div className="text-xs font-semibold text-red-700">
        {feature.sourceUrl ? (
          <a
            href={feature.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {feature.ticketKey}
          </a>
        ) : (
          feature.ticketKey
        )}
      </div>

      <div className="mt-1 text-sm font-medium text-gray-900">
        {feature.title}
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
        {typeof feature.storyCount === 'number' && (
          <span className="rounded bg-gray-100 px-2 py-1">
            📦 {feature.storyCount}
          </span>
        )}

        {typeof feature.dependencyCount === 'number' && (
          <span className="rounded bg-gray-100 px-2 py-1">
            🔗 {feature.dependencyCount}
          </span>
        )}

        {feature.commitmentStatus && (
          <span className="rounded bg-gray-100 px-2 py-1">
            {feature.commitmentStatus}
          </span>
        )}
      </div>
    </div>
  );
}
