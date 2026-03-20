'use client';

import { useState } from 'react';
import { AlertTriangle, FileText } from 'lucide-react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Feature, FeatureStory } from '@/lib/models';
import { useDispatchStore } from '@/store/useDispatchStore';
import { highlightMatch } from '@/lib/highlightMatch';
import { stripFeaturePrefix } from '@/lib/stripFeaturePrefix';

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

  // Colour by highest criticality: conflict (high) → red, blocks (medium) → amber,
  // requires (low) → green.
  let cls = 'bg-gray-100 text-gray-600';
  if (counts.conflict > 0)      cls = 'bg-red-100 text-red-700';
  else if (counts.blocks > 0)   cls = 'bg-amber-100 text-amber-700';
  else if (counts.requires > 0) cls = 'bg-green-100 text-green-700';

  return { total, cls };
}

// Returns badge label + Tailwind class string, styled by source system.
function getSourceBadge(
  sourceSystem: string | null | undefined
): { label: string; cls: string } | null {
  if (!sourceSystem) return null;
  const s = sourceSystem.toLowerCase();
  if (s.includes('jira'))                    return { label: 'JIRA', cls: 'bg-cyan-50 text-cyan-700' };
  if (s.includes('ado') || s.includes('azure')) return { label: 'ADO',  cls: 'bg-blue-50 text-blue-600' };
  // CSV, manual, or other import sources
  return { label: sourceSystem.toUpperCase().slice(0, 6), cls: 'bg-gray-100 text-gray-500' };
}

// Maps story workflow status to a colour.
function storyStatusColor(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done')        return '#16a34a'; // success green
  if (s === 'in progress') return '#d97706'; // warning amber
  if (s === 'blocked')     return '#dc2626'; // danger red
  return '#9ca3af';                          // neutral gray (To Do / unknown)
}

function StatusDot({ status, size = 8 }: { status: string | null; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: storyStatusColor(status),
        flexShrink: 0,
      }}
    />
  );
}

// Story-sprint distribution dots — Detailed mode only.
// Suppressed when all stories are in the same sprint as the parent feature.
function StorySprintDots({
  stories,
  featureSprintNumber,
}: {
  stories: FeatureStory[];
  featureSprintNumber: number | null | undefined;
}) {
  if (!stories.length) return null;

  // Group by resolved sprint number; skip unassigned stories.
  const bySprint = new Map<number, FeatureStory[]>();
  stories.forEach((s) => {
    if (s.sprintNumber === null || s.sprintNumber === undefined) return;
    if (!bySprint.has(s.sprintNumber)) bySprint.set(s.sprintNumber, []);
    bySprint.get(s.sprintNumber)!.push(s);
  });

  if (!bySprint.size) return null;

  // Suppress when every story lands in the same sprint as the feature.
  const sprintNums = [...bySprint.keys()];
  if (sprintNums.length === 1 && sprintNums[0] === featureSprintNumber) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      {sprintNums
        .sort((a, b) => a - b)
        .map((sprintNum) => {
          const sprintStories = bySprint.get(sprintNum)!;
          return (
            <span key={sprintNum} className="flex items-center gap-0.5">
              <span className="text-gray-400" style={{ fontSize: 10 }}>
                S{sprintNum}
              </span>
              {sprintStories.length > 6 ? (
                // Condensed format: ●×N
                <span className="flex items-center gap-0.5">
                  <StatusDot status={null} size={7} />
                  <span className="text-gray-500" style={{ fontSize: 10 }}>
                    ×{sprintStories.length}
                  </span>
                </span>
              ) : (
                sprintStories.map((story, i) => (
                  <StatusDot key={i} status={story.status} size={8} />
                ))
              )}
            </span>
          );
        })}
    </div>
  );
}

export function FeatureCard({ feature, searchTerm }: FeatureCardProps) {
  const { density } = useDispatchStore();
  const [storiesOpen, setStoriesOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: feature.id,
      data: { featureId: feature.id },
    });

  // Transform/transition on the outer wrapper so card + story panel move together.
  const wrapperStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusPill  = getStatusPill(feature.commitmentStatus);
  const depBadge    = getDepBadge(feature.dependencyCounts);
  const sourceBadge = getSourceBadge(feature.sourceSystem);
  const isCompact   = density === 'compact';
  const stories     = feature.stories ?? [];

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      {/* ── Feature card ──────────────────────────────────────────────── */}
      <div
        {...attributes}
        {...listeners}
        className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-transform duration-100 hover:scale-[1.01]"
      >
        {/* Header row: ticket key (left) + source system badge (right).
            Source badge is always visible — both compact and detailed. */}
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1 truncate text-xs font-semibold text-red-700">
            <a
              href={feature.sourceUrl ?? '#'}
              target={feature.sourceUrl ? '_blank' : undefined}
              rel={feature.sourceUrl ? 'noreferrer' : undefined}
              title={feature.sourceUrl ? undefined : 'View in source system (coming soon)'}
              className="hover:underline"
              onClick={feature.sourceUrl ? undefined : (e) => e.preventDefault()}
            >
              <Highlight text={feature.ticketKey} term={searchTerm} />
            </a>
          </div>

          {sourceBadge && (
            <span
              className={`shrink-0 font-medium ${sourceBadge.cls}`}
              style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4 }}
            >
              {sourceBadge.label}
            </span>
          )}
        </div>

        {/* Title */}
        <div className="mt-1 text-sm font-medium leading-snug text-gray-900">
          <Highlight text={feature.title} term={searchTerm} />
        </div>

        {/* Bottom row: commitment pill + story count + dep badge.
            Story count: detailed only. Dep badge: always visible. */}
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${statusPill.cls}`}>
            {statusPill.label}
          </span>

          {/* Story count — FileText icon, detailed only */}
          {!isCompact && typeof feature.storyCount === 'number' && feature.storyCount > 0 && (
            <span
              className="flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-gray-600"
              title={`${feature.storyCount} ${feature.storyCount === 1 ? 'story' : 'stories'} linked to this feature`}
            >
              <FileText size={14} />
              {feature.storyCount}
            </span>
          )}

          {/* Dependency badge — AlertTriangle icon, always visible */}
          {depBadge && (
            <span className={`flex items-center gap-1 rounded px-2 py-0.5 font-medium ${depBadge.cls}`}>
              <AlertTriangle size={12} />
              {depBadge.total} dep{depBadge.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Story-sprint dot indicator — detailed only */}
        {!isCompact && stories.length > 0 && (
          <StorySprintDots
            stories={stories}
            featureSprintNumber={feature.sprintNumber}
          />
        )}

        {/* Story expand toggle — detailed only */}
        {!isCompact && stories.length > 0 && (
          <button
            className="mt-2 flex w-full items-center gap-1 text-gray-400 hover:text-gray-600"
            style={{ fontSize: 11 }}
            // Stop pointer-down from activating the dnd-kit drag sensor.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setStoriesOpen((o) => !o)}
          >
            <span
              style={{
                display: 'inline-block',
                transform: storiesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease-out',
              }}
            >
              ▶
            </span>
            <span>
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </span>
          </button>
        )}
      </div>

      {/* ── Expandable story panel ── below card, animated ─────────────── */}
      {!isCompact && stories.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateRows: storiesOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 150ms ease-out',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div className="mt-px">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center gap-1.5 py-1 pr-1"
                  style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: 12 }}
                >
                  {/* Ticket key — muted red, monospace */}
                  <a
                    href="#"
                    className="shrink-0 font-mono hover:underline"
                    style={{ fontSize: 10, color: '#991b1b', opacity: 0.75 }}
                    title="View in source system (coming soon)"
                    onClick={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {story.ticketKey}
                  </a>

                  {/* Story title — feature prefix stripped if present */}
                  <span className="flex-1 truncate text-gray-700" style={{ fontSize: 12 }}>
                    {stripFeaturePrefix(story.title, feature.title)}
                  </span>

                  {/* Sprint badge — only when story sprint differs from feature sprint */}
                  {story.sprintNumber !== null &&
                    story.sprintNumber !== undefined &&
                    story.sprintNumber !== feature.sprintNumber && (
                      <span
                        className="shrink-0 rounded px-1 text-gray-500"
                        style={{ fontSize: 10, backgroundColor: '#f3f4f6' }}
                      >
                        S{story.sprintNumber}
                      </span>
                    )}

                  {/* Status dot */}
                  <StatusDot status={story.status} size={7} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
