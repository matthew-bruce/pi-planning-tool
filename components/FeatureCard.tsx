'use client';

import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Feature } from '@/lib/models';
import { useDispatchStore } from '@/store/useDispatchStore';
import { highlightMatch } from '@/lib/highlightMatch';

type FeatureCardProps = {
  feature: Feature;
  searchTerm?: string;
};

function Highlight({ text, term }: { text: string; term?: string }) {
  const segments = highlightMatch(text, term ?? '');
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            style={{ background: '#FDDD1C', color: '#78350f', borderRadius: 2, padding: '0 2px' }}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

function getStatusPill(status: string | null | undefined) {
  const s = (status ?? '').toLowerCase();
  if (s === 'committed') return { label: 'Committed', cls: 'bg-green-100 text-green-700' };
  if (s === 'planned')   return { label: 'Planned',   cls: 'bg-blue-100 text-blue-700' };
  return                        { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' };
}

function getDepBadge(counts: Feature['dependencyCounts']) {
  const total = counts.requires + counts.blocks + counts.conflict;
  if (total === 0) return null;

  let cls = 'bg-gray-100 text-gray-600';
  if (counts.conflict > 0)      cls = 'bg-red-100 text-red-700';
  else if (counts.blocks > 0)   cls = 'bg-amber-100 text-amber-700';
  else if (counts.requires > 0) cls = 'bg-green-100 text-green-700';

  return { total, cls };
}

function getSourceBadge(sourceSystem: string | null | undefined) {
  if (!sourceSystem) return null;
  const s = sourceSystem.toLowerCase();
  if (s.includes('jira')) return 'JIRA';
  if (s.includes('ado') || s.includes('azure')) return 'ADO';
  return sourceSystem.toUpperCase().slice(0, 6);
}

export function FeatureCard({ feature, searchTerm }: FeatureCardProps) {
  const { density } = useDispatchStore();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: feature.id,
      data: { featureId: feature.id },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusPill = getStatusPill(feature.commitmentStatus);
  const depBadge   = getDepBadge(feature.dependencyCounts);
  const sourceBadge = getSourceBadge(feature.sourceSystem);
  const isCompact = density === 'compact';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-transform duration-100 hover:scale-[1.01]"
    >
      {/* Ticket key */}
      <div className="text-xs font-semibold text-red-700 truncate">
        {feature.sourceUrl ? (
          <a
            href={feature.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            <Highlight text={feature.ticketKey} term={searchTerm} />
          </a>
        ) : (
          <Highlight text={feature.ticketKey} term={searchTerm} />
        )}
      </div>

      {/* Source system badge — below ticket key, hidden in compact */}
      {!isCompact && sourceBadge && (
        <div className="text-gray-400" style={{ fontSize: 9 }}>
          {sourceBadge}
        </div>
      )}

      <div className="mt-1 text-sm font-medium text-gray-900 leading-snug">
        <Highlight text={feature.title} term={searchTerm} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {/* Commitment status pill */}
        <span className={`rounded-full px-2 py-0.5 font-medium ${statusPill.cls}`}>
          {statusPill.label}
        </span>

        {/* Story count and dep badge — hidden in compact */}
        {!isCompact && typeof feature.storyCount === 'number' && feature.storyCount > 0 && (
          <span
            className="rounded bg-gray-100 px-2 py-0.5 text-gray-600"
            title={`${feature.storyCount} ${feature.storyCount === 1 ? 'story' : 'stories'} linked to this feature`}
          >
            📦 {feature.storyCount}
          </span>
        )}

        {!isCompact && depBadge && (
          <span className={`rounded px-2 py-0.5 font-medium ${depBadge.cls}`}>
            🔗 {depBadge.total} dep{depBadge.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
