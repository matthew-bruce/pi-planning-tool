'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  TeamPlanningData,
  TeamPlanningFeatureGroup,
} from '@/lib/supabase/teamPlanning';
import type { Feature, FeatureStory } from '@/lib/models';
import { useDispatchStore } from '@/store/useDispatchStore';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { SprintHeader } from '@/components/ui/SprintHeader';
import { EmptyCell } from '@/components/ui/EmptyCell';
import { PageHeader } from '@/components/ui/PageHeader';
import { FeatureCardStatic } from '@/components/ui/FeatureCard';

type Props = { initialData: TeamPlanningData };

// ─── Adapter: TeamPlanningFeatureGroup → Feature ──────────────────────────────

function groupToFeature(group: TeamPlanningFeatureGroup): Feature {
  const stories: FeatureStory[] = group.stories.map((s) => ({
    id: s.id,
    ticketKey: s.ticketKey,
    title: s.title,
    sprintId: null,
    sprintNumber: null,
    status: s.status,
  }));
  return {
    id: group.featureId,
    ticketKey: group.featureTicketKey,
    title: group.featureTitle,
    initiativeId: '',
    teamId: '',
    sprintId: null,
    sourceUrl: group.featureSourceUrl,
    commitmentStatus: group.featureCommitmentStatus,
    storyCount: group.stories.length,
    dependencyCounts: { requires: 0, blocks: 0, conflict: 0 },
    stories,
  };
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
      <WarningBanner>No active Program Increment configured.</WarningBanner>
    );
  }

  if (!data.sprints.length) {
    return (
      <WarningBanner>No sprints configured for {data.cycle.name}.</WarningBanner>
    );
  }

  const noTeams = !loading && data.teams.length === 0;

  return (
    <div>
      <PageHeader
        title="Team Planning Room"
        subtitle={
          <>
            {data.cycle.name}{loading ? ' • Loading…' : ''}{' '}
            <span className="text-xs">
              {new Date(data.cycle.start_date).toLocaleDateString('en-GB')} –{' '}
              {new Date(data.cycle.end_date).toLocaleDateString('en-GB')}
            </span>
          </>
        }
      />

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
            <SprintHeader sprints={data.sprints} />

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
                        <span className="text-sm font-semibold text-gray-800">
                          {team.name}
                        </span>
                        {team.platform && (
                          <span className="text-xs font-normal text-gray-400">
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
                      <div className="overflow-hidden">
                        {/*
                          flex divide-x mirrors the sticky header above exactly —
                          flex-1 on each column ensures widths align.
                        */}
                        <div className="flex divide-x divide-gray-200">
                          {team.sprintColumns.map((col) => (
                            <div
                              key={col.sprintId}
                              className="min-h-[60px] min-w-0 flex-1 p-2"
                            >
                              {col.featureGroups.length === 0 ? (
                                <EmptyCell />
                              ) : (
                                <div className="space-y-2">
                                  {col.featureGroups.map((group) => (
                                    <FeatureCardStatic
                                      key={group.featureId}
                                      feature={groupToFeature(group)}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Sprint total — shown only when there are stories */}
                              {col.totalStories > 0 && (
                                <div className="mt-1 border-t border-gray-100 pt-1 text-right text-[10px] text-gray-400">
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
