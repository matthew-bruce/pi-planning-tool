'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatSprintRange } from '@/lib/utils';
import type {
  TeamPlanningData,
  TeamPlanningFeatureGroup,
  TeamPlanningStory,
} from '@/lib/supabase/teamPlanning';
import { useDispatchStore } from '@/store/useDispatchStore';
import { stripFeaturePrefix } from '@/lib/stripFeaturePrefix';
import { getStatusPillClasses } from '@/components/ui/StatusPill';

type Props = { initialData: TeamPlanningData };

// ─── Small presentational helpers ────────────────────────────────────────────

function storyStatusColor(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done') return '#16a34a';
  if (s === 'in progress') return '#d97706';
  if (s === 'blocked') return '#dc2626';
  return '#9ca3af';
}

function StatusDot({ status }: { status: string | null }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        backgroundColor: storyStatusColor(status),
        flexShrink: 0,
      }}
    />
  );
}


// ─── Story row ────────────────────────────────────────────────────────────────

function StoryRow({
  story,
  featureTitle,
}: {
  story: TeamPlanningStory;
  featureTitle: string;
}) {
  const displayTitle = stripFeaturePrefix(story.title, featureTitle);

  return (
    <div className="flex items-start gap-1.5 py-1">
      <StatusDot status={story.status} />
      <div className="min-w-0 flex-1">
        <span
          className="font-mono shrink-0"
          style={{ fontSize: 10, color: '#991b1b', opacity: 0.8 }}
        >
          {story.ticketKey}
        </span>{' '}
        <span className="text-gray-700 leading-snug" style={{ fontSize: 12 }}>
          {displayTitle}
        </span>
      </div>
      {story.storyPoints !== null && (
        <span
          className="shrink-0 rounded bg-gray-100 px-1 text-gray-500 font-medium"
          style={{ fontSize: 10 }}
          title={`${story.storyPoints} story points`}
        >
          {story.storyPoints}
        </span>
      )}
    </div>
  );
}

// ─── Feature group (sub-header + stories) ────────────────────────────────────

function FeatureGroup({ group }: { group: TeamPlanningFeatureGroup }) {
  const pill = getStatusPillClasses(group.featureCommitmentStatus);
  const isUnassigned = group.featureId === 'unassigned';

  return (
    <div className="mb-2">
      {/* Feature sub-header */}
      <div
        className="mb-1 rounded px-1.5 py-1"
        style={{ backgroundColor: '#f3f4f6' }}
      >
        {!isUnassigned && (
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span
              className="font-mono shrink-0"
              style={{ fontSize: 9, color: '#991b1b', opacity: 0.75 }}
            >
              {group.featureTicketKey}
            </span>
            <span
              className={`shrink-0 rounded-full px-1.5 font-medium ${pill.cls}`}
              style={{ fontSize: 9 }}
            >
              {pill.label}
            </span>
          </div>
        )}
        <div
          className="truncate font-medium text-gray-700"
          style={{ fontSize: isUnassigned ? 11 : 11 }}
          title={group.featureTitle}
        >
          {isUnassigned ? (
            <span className="italic text-gray-400">{group.featureTitle}</span>
          ) : (
            group.featureTitle
          )}
        </div>
      </div>

      {/* Stories */}
      <div className="pl-1">
        {group.stories.map((story) => (
          <StoryRow
            key={story.id}
            story={story}
            featureTitle={group.featureTitle}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function TeamPlanningBoard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [collapsedTeams, setCollapsedTeams] = useState<
    Record<string, boolean>
  >({});

  const { selectedArtId, setSelectedArtId, setArts } = useDispatchStore();

  // Sync store when server-rendered initialData arrives.
  // Must NOT include selectedArtId in deps — user ART clicks must not
  // re-run this effect and overwrite their selection with the stale server value.
  useEffect(() => {
    setArts(initialData.arts);
    setData(initialData);
    if (initialData.selectedArtId) {
      setSelectedArtId(initialData.selectedArtId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Re-fetch when the user switches ART via the planning header.
  useEffect(() => {
    if (!selectedArtId) return;
    if (selectedArtId === data.selectedArtId) {
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('selectedArtId', selectedArtId);
    if (data.cycle?.id) params.set('selectedCycleId', data.cycle.id);

    let cancelled = false;
    setLoading(true);

    fetch(`/api/team-planning?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        return res.json();
      })
      .then((payload: TeamPlanningData) => {
        if (!cancelled) setData(payload);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArtId, data.cycle?.id, data.selectedArtId]);

  // ── Empty / error states ──────────────────────────────────────────────────

  if (!data.cycle) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">
        No active Program Increment configured.
      </div>
    );
  }

  if (!data.sprints.length) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">
        No sprints configured for {data.cycle.name}.
      </div>
    );
  }

  const noTeams = !loading && data.teams.length === 0;

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Team Planning Room
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {data.cycle.name}
          {loading ? ' • Loading…' : ''}{' '}
          <span className="text-xs">
            {new Date(data.cycle.start_date).toLocaleDateString('en-GB')} –{' '}
            {new Date(data.cycle.end_date).toLocaleDateString('en-GB')}
          </span>
        </p>
      </div>

      {/* ── Board ────────────────────────────────────────────────────────── */}
      <div className="min-w-0">
        {noTeams ? (
          <div className="rounded border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 text-center">
            No teams with assigned stories found for the selected ART and Program
            Increment.
          </div>
        ) : (
          <>
            {/*
              Sticky sprint header — appears once, sticks to viewport top as
              the user scrolls through team sections.
              The flex layout mirrors every team row exactly so column widths align.
            */}
            <div
              className="sticky top-0 z-30 mb-2 border-b border-gray-200 shadow-sm"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <div className="flex divide-x divide-gray-200 px-px">
                {data.sprints.map((sprint) => (
                  <div key={sprint.id} className="flex-1 min-w-0 px-3 py-2">
                    <div
                      className="font-semibold text-gray-800"
                      style={{ fontSize: 14 }}
                    >
                      {sprint.name ?? `Sprint ${sprint.number}`}
                    </div>
                    <div className="text-gray-500" style={{ fontSize: 11 }}>
                      {formatSprintRange(sprint.startDate, sprint.endDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team sections */}
            <div className="space-y-3">
              {data.teams.map((team) => {
                const collapsed = collapsedTeams[team.id];

                return (
                  <section
                    key={team.id}
                    className="rounded border border-gray-200 overflow-hidden bg-white"
                  >
                    {/* Team header bar */}
                    <button
                      className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left border-b border-gray-200"
                      onClick={() =>
                        setCollapsedTeams((prev) => ({
                          ...prev,
                          [team.id]: !prev[team.id],
                        }))
                      }
                    >
                      <span className="flex items-center gap-2">
                        <ChevronDown
                          size={14}
                          className="text-gray-400 shrink-0"
                          style={{
                            transform: collapsed
                              ? 'rotate(-90deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 150ms ease-out',
                          }}
                        />
                        <span className="font-semibold text-gray-800" style={{ fontSize: 14 }}>
                          {team.name}
                        </span>
                        {team.platform && (
                          <span className="text-gray-400 font-normal" style={{ fontSize: 12 }}>
                            ({team.platform})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {team.totalStories}{' '}
                        {team.totalStories === 1 ? 'story' : 'stories'}
                        {team.totalPoints > 0 && ` • ${team.totalPoints} pts`}
                      </span>
                    </button>

                    {/* Sprint columns — animated collapse */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: collapsed ? '0fr' : '1fr',
                        transition: collapsed
                          ? 'grid-template-rows 150ms ease-in'
                          : 'grid-template-rows 180ms ease-out',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        {/*
                          flex divide-x mirrors the sticky header above exactly —
                          flex-1 on each column ensures widths align.
                        */}
                        <div className="flex divide-x divide-gray-200">
                          {team.sprintColumns.map((col) => (
                            <div
                              key={col.sprintId}
                              className="flex-1 min-w-0 p-2"
                              style={{ minHeight: 60 }}
                            >
                              {col.featureGroups.length === 0 ? (
                                <div className="flex min-h-[48px] items-center justify-center">
                                  <span
                                    className="text-gray-200"
                                    style={{ fontSize: 11 }}
                                  >
                                    —
                                  </span>
                                </div>
                              ) : (
                                col.featureGroups.map((group) => (
                                  <FeatureGroup key={group.featureId} group={group} />
                                ))
                              )}

                              {/* Sprint total — shown only when there are stories */}
                              {col.totalStories > 0 && (
                                <div
                                  className="mt-1 border-t border-gray-100 pt-1 text-right text-gray-400"
                                  style={{ fontSize: 10 }}
                                >
                                  {col.totalStories}{' '}
                                  {col.totalStories === 1 ? 'story' : 'stories'}
                                  {col.totalPoints > 0 &&
                                    ` • ${col.totalPoints} pts`}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
