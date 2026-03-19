'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { highlightMatch } from '@/lib/highlightMatch';
import { formatSprintRange } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ParkingLotDrawer } from '@/components/ParkingLotDrawer';
import { SprintColumn } from '@/components/SprintColumn';
import type { SortingFrameData } from '@/lib/supabase/sortingFrame';
import { useDispatchStore } from '@/store/useDispatchStore';

type Props = { initialData: SortingFrameData };

// Value Stream colour palette — warm RMG tones, vs1–vs8
const VS_COLOURS = [
  { bg: '#fce7e7', text: '#991b1b' }, // vs1
  { bg: '#fef9c3', text: '#854d0e' }, // vs2
  { bg: '#ffedd5', text: '#9a3412' }, // vs3
  { bg: '#fce7f3', text: '#831843' }, // vs4
  { bg: '#fef3c7', text: '#92400e' }, // vs5
  { bg: '#f0fdf4', text: '#14532d' }, // vs6
  { bg: '#f0f9ff', text: '#0c4a6e' }, // vs7
  { bg: '#f5f3ff', text: '#4c1d95' }, // vs8
];

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

function formatTeamType(teamType: string): string {
  return teamType.charAt(0).toUpperCase() + teamType.slice(1).toLowerCase();
}

function getVsColour(index: number) {
  return VS_COLOURS[index % VS_COLOURS.length];
}


export function SortingFrameBoard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collapsedInitiatives, setCollapsedInitiatives] = useState<Record<string, boolean>>({});
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const {
    density,
    selectedArtId,
    setSelectedArtId,
    assignFeatureSprint,
    setArts,
  } = useDispatchStore();

  // Sync store + local state when server-rendered initialData arrives.
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

  useEffect(() => {
    if (!selectedArtId) return;
    if (selectedArtId === data.selectedArtId) {
      // Already showing the right ART — nothing to fetch.
      setLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('selectedArtId', selectedArtId);

    if (data.cycle?.id) {
      params.set('selectedCycleId', data.cycle.id);
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/sorting-frame?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load sorting frame: ${response.status}`);
        }
        return response.json();
      })
      .then((payload: SortingFrameData) => {
        if (cancelled) return;
        setData(payload);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArtId, data.cycle?.id, data.selectedArtId]);

  const filteredInitiatives = useMemo(() => {
    const lower = search.toLowerCase();

    return data.initiatives
      .map((initiative) => {
        const teams = initiative.teams
          .filter((team) => platformFilter === 'ALL' || team.platform === platformFilter)
          .map((team) => ({
            ...team,
            features: team.features.filter((feature) => {
              if (!lower) return true;
              const haystack = [
                feature.ticketKey,
                feature.title,
                team.name,
                team.platform ?? '',
                team.teamType ?? '',
              ].join(' ').toLowerCase();
              return haystack.includes(lower);
            }),
          }))
          .filter((team) => team.features.length > 0);

        const featuresCount = teams.reduce((sum, team) => sum + team.features.length, 0);

        const dependencyCount = teams.reduce(
          (sum, team) =>
            sum +
            team.features.reduce(
              (featureSum, feature) =>
                featureSum +
                feature.dependencyCounts.requires +
                feature.dependencyCounts.blocks +
                feature.dependencyCounts.conflict,
              0
            ),
          0
        );

        const conflictCount = teams.reduce(
          (sum, team) =>
            sum +
            team.features.reduce(
              (featureSum, feature) => featureSum + feature.dependencyCounts.conflict,
              0
            ),
          0
        );

        return {
          ...initiative,
          teams,
          summary: {
            teamsCount: teams.length,
            featuresCount,
            dependencyCount,
            conflictCount,
          },
        };
      })
      .filter((initiative) => initiative.summary.featuresCount > 0);
  }, [data.initiatives, platformFilter, search]);

  const parking = useMemo(() => {
    return data.parkingLot.filter((feature) => {
      const textMatch = `${feature.ticketKey} ${feature.title}`
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!textMatch) return false;
      if (platformFilter === 'ALL') return true;

      const team = data.initiatives
        .flatMap((initiative) => initiative.teams)
        .find((lane) => lane.id === feature.teamId);

      return team?.platform === platformFilter;
    });
  }, [data.initiatives, data.parkingLot, platformFilter, search]);

  const emptyBoardColumns = useMemo(() => {
    return data.sprints.map((sprint) => ({
      ...sprint,
      features: [],
    }));
  }, [data.sprints]);

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;

    if (!over) return;

    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

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

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Sorting Frame</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {data.cycle.name}{loading ? ' • Loading…' : ''}{' '}
          <span className="text-xs">
            {new Date(data.cycle.start_date).toLocaleDateString('en-GB')} – {new Date(data.cycle.end_date).toLocaleDateString('en-GB')}
          </span>
        </p>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          className="rounded border px-2 py-1"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="ALL">All platforms</option>
          {data.availablePlatforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <input
          className="rounded border px-2 py-1"
          placeholder="Search ticket, title, team or platform"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex">
        {/*
          Board content wrapper — NO overflow-x here so that position:sticky on
          the sprint header works relative to the page scroll (not a sub-container).
          Sprint columns use flex-1 so they fill available width without overflowing.
        */}
        <div className="min-w-0 flex-1 pr-3">
          {!filteredInitiatives.length ? (
            <section className="rounded border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 p-3">
                <div className="font-semibold text-gray-800">
                  Empty planning canvas
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  This cycle has sprint structure configured, but there are no
                  initiatives, teams, or imported planning items yet for the
                  selected ART.
                </div>
              </div>

              <div className="p-3">
                <div className="mb-3 text-xs text-gray-500">
                  You can still review the sprint layout for {data.cycle.name}.
                </div>

                <div className="flex gap-2 pb-1">
                  {emptyBoardColumns.map((sprint) => (
                    <div key={sprint.id} className="w-64 shrink-0">
                      <SprintColumn sprint={sprint} features={[]} />
                      <div className="mt-2 rounded border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                        No planned features
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <>
              {/*
                Sticky sprint header — shown once, sticks to viewport top as the
                user scrolls through VS sections.

                top-0: planning header is not fixed/sticky so viewport top is correct.
                z-30:  above VS section stacking contexts (sections use overflow:hidden).
                The flex layout (w-40 spacer + flex-1 cells) mirrors every team row
                exactly so vertical dividers align perfectly.
              */}
              <div className="sticky top-0 z-30 mb-2 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex divide-x divide-gray-200">
                  {data.sprints.map((sprint) => (
                    <div key={sprint.id} className="flex-1 min-w-0 px-3 py-2">
                      <div className="text-sm font-semibold text-gray-800">
                        {sprint.name ?? `Sprint ${sprint.number}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatSprintRange(sprint.startDate, sprint.endDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VS sections */}
              <div className="space-y-4">
                {filteredInitiatives.map((initiative, initiativeIndex) => {
                  const vsColour = getVsColour(initiativeIndex);
                  const collapsed = collapsedInitiatives[initiative.id];

                  return (
                    <section
                      key={initiative.id}
                      className="rounded border overflow-hidden"
                      style={{ borderColor: vsColour.bg, backgroundColor: vsColour.bg }}
                    >
                      {/* Value Stream section header — full width */}
                      <button
                        className="flex w-full items-center justify-between p-2 text-left"
                        style={{ backgroundColor: vsColour.bg }}
                        onClick={() =>
                          setCollapsedInitiatives((prev) => ({
                            ...prev,
                            [initiative.id]: !prev[initiative.id],
                          }))
                        }
                      >
                        <div className="flex items-center gap-2">
                          {collapsed ? <ChevronRight size={14} style={{ color: vsColour.text }} /> : <ChevronDown size={14} style={{ color: vsColour.text }} />}
                          <span className="font-semibold" style={{ color: vsColour.text }}>
                            {initiative.name}
                          </span>
                        </div>
                        <span style={{ color: vsColour.text, opacity: 0.85, fontSize: 12, fontWeight: 500 }}>
                          Teams {initiative.summary.teamsCount} • Features{' '}
                          {initiative.summary.featuresCount} • Dependencies{' '}
                          {initiative.summary.dependencyCount} • Conflicts{' '}
                          {initiative.summary.conflictCount}
                        </span>
                      </button>

                      {!collapsed && (
                        /*
                          Each team is a block: full-width bar on top, sprint cells below.
                          divide-y on the container adds a hairline between teams.
                          divide-x on the sprint row aligns vertical dividers with the
                          sticky header's sprint cells above.
                        */
                        <div className="divide-y divide-gray-200">
                          {initiative.teams.map((team) => {
                            const teamKey = `${initiative.id}-${team.id}`;
                            const teamCollapsed = collapsedTeams[teamKey];

                            return (
                              <div key={team.id}>
                                {/* Full-width team bar — spans all sprint columns */}
                                <button
                                  className="flex w-full items-center justify-between bg-white px-3 py-2 text-left"
                                  style={{ borderLeft: `3px solid ${vsColour.text}` }}
                                  onClick={() =>
                                    setCollapsedTeams((prev) => ({
                                      ...prev,
                                      [teamKey]: !prev[teamKey],
                                    }))
                                  }
                                >
                                  <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-gray-800">
                                    {teamCollapsed
                                      ? <ChevronRight size={12} className="shrink-0 text-gray-400" />
                                      : <ChevronDown size={12} className="shrink-0 text-gray-400" />}
                                    <span className="truncate">
                                      <Highlight text={team.name} term={search} />
                                      {(team.platform ?? (team.teamType ? formatTeamType(team.teamType) : null)) && (
                                        <span className="ml-1 font-normal text-gray-500">
                                          (<Highlight text={team.platform ?? formatTeamType(team.teamType!)} term={search} />)
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  <span className="ml-2 shrink-0 text-xs text-gray-500">
                                    {team.features.length} features
                                  </span>
                                </button>

                                {/* Sprint cells — row below the team bar */}
                                {!teamCollapsed && (
                                  <div className="flex divide-x divide-gray-200">
                                    {data.sprints.map((sprint) => (
                                      <SprintColumn
                                        key={`${team.id}-${sprint.id}`}
                                        sprint={sprint}
                                        features={team.features.filter(
                                          (feature) => feature.sprintId === sprint.id
                                        )}
                                        showHeader={false}
                                        searchTerm={search}
                                        className="flex-1 min-w-0 bg-white p-2 min-h-[80px]"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <ParkingLotDrawer features={parking} />
      </div>
    </DndContext>
  );
}
