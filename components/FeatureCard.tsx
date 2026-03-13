'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Feature } from '@/lib/models';
import { useDispatchStore } from '@/store/useDispatchStore';

export function FeatureCard({ feature }: { feature: Feature }) {
  const { initiatives, teams, density } = useDispatchStore();
  const initiative = initiatives.find((i) => i.id === feature.initiativeId);
  const team = teams.find((t) => t.id === feature.teamId);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: feature.id, data: { featureId: feature.id } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="rounded border border-gray-300 bg-white p-2 shadow-sm mb-2 text-xs cursor-grab"
    >
      <a href={feature.sourceUrl ?? `https://placeholder.local/${feature.ticketKey}`} target="_blank" rel="noreferrer" className="font-semibold text-royalRed underline">
      <a href={`https://placeholder.local/${feature.ticketKey}`} target="_blank" rel="noreferrer" className="font-semibold text-royalRed underline">
        {feature.ticketKey}
      </a>
      <p className="text-gray-800">{feature.title}</p>
      <div className="flex gap-1 mt-1 flex-wrap">
        <span className="bg-gray-100 px-1 rounded">req:{feature.dependencyCounts.requires}</span>
        <span className="bg-gray-100 px-1 rounded">blk:{feature.dependencyCounts.blocks}</span>
        <span className="bg-gray-100 px-1 rounded">cnf:{feature.dependencyCounts.conflict}</span>
        <span className="bg-gray-100 px-1 rounded">SP:{feature.storyCount}</span>
        {feature.commitmentStatus ? <span className="bg-red-50 px-1 rounded text-royalRed">{feature.commitmentStatus}</span> : null}
      </div>
      {density === 'detailed' && (
        <div className="mt-1 space-y-1 text-[11px]">
          <div className="text-gray-600">{initiative?.name}</div>
          <div className="inline-block rounded bg-red-50 px-2 py-0.5 text-royalRed">{team?.name} ({team?.platform})</div>
          <div className="text-gray-500">Status: {feature.status ?? 'n/a'}</div>
          <div className="text-gray-500">Story breakdown: {Math.ceil(feature.storyCount / 2)} build / {Math.floor(feature.storyCount / 2)} test</div>
        </div>
      )}
    </div>
  );
}
