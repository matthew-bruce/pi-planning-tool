'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatSprintRange } from '@/lib/utils';
import { Highlight } from '@/components/ui/Highlight';
import { WarningBanner } from '@/components/ui/WarningBanner';
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
    setDensity,
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

  // Expand/collapse all state derivation.
  const allExpanded = useMemo(() => {
    if (!filteredInitiatives.length) return true;
    return filteredInitiatives.every(
      (initiative) =>
        !collapsedInitiatives[initiative.id] &&
        initiative.teams.every((team) => !collapsedTeams[`${initiative.id}-${team.id}`])
    );
  }, [filteredInitiatives, collapsedInitiatives, collapsedTeams]);

  const allCollapsed = useMemo(() => {
    if (!filteredInitiatives.length) return true;
    return filteredInitiatives.every(
      (initiative) =>
        !!collapsedInitiatives[initiative.id] &&
        initiative.teams.every((team) => !!collapsedTeams[`${initiative.id}-${team.id}`])
    );
  }, [filteredInitiatives, collapsedInitiatives, collapsedTeams]);

  const expandAll = () => {
    setCollapsedInitiatives({});
    setCollapsedTeams({});
  };

  const collapseAll = () => {
    const initiatives: Record<string, boolean> = {};
    const teams: Record<string, boolean> = {};
    filteredInitiatives.forEach((initiative) => {
      initiatives[initiative.id] = true;
      initiative.teams.forEach((team) => {
        teams[`${initiative.id}-${team.id}`] = true;
      });
    });
    setCollapsedInitiatives(initiatives);
    setCollapsedTeams(teams);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;

    if (!over) return;

    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

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

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Sorting Frame</h1>
          <div className="flex shrink-0 items-center gap-2">
            <select
              className="rounded border px-2 py-1 text-sm"
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
              className="rounded border px-2 py-1 text-sm"
              style={{ minWidth: 260 }}
              placeholder="Search ticket, title, team or platform"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Compact / Detailed density toggle */}
            {(['compact', 'detailed'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={[
                  'rounded border px-2 py-1 text-sm capitalize',
                  density === d
                    ? 'border-royalRed bg-royalRed text-white'
                    : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50',
                ].join(' ')}
              >
                {d}
              </button>
            ))}

            {/* Expand / Collapse all — only shown when board has content */}
            {filteredInitiatives.length > 0 && (
              <>
                <button
                  onClick={expandAll}
                  disabled={allExpanded}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Expand all sections and teams"
                >
                  ⊞ Expand all
                </button>
                <button
                  onClick={collapseAll}
                  disabled={allCollapsed}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Collapse all sections and teams"
                >
                  ⊟ Collapse all
                </button>
              </>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          {data.cycle.name}{loading ? ' • Loading…' : ''}{' '}
          <span className="text-xs">
            {new Date(data.cycle.start_date).toLocaleDateString('en-GB')} – {new Date(data.cycle.end_date).toLocaleDateString('en-GB')}
          </span>
        </p>
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
              {/*
                px-px on the inner row matches the 1px left+right border on each
                VS <section>, so all 6 sprint column headers align with the cells below.
              */}
              <div className="sticky top-0 z-30 mb-2 border-b border-gray-200 shadow-sm" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="flex divide-x divide-gray-200 px-px">
                  {data.sprints.map((sprint) => (
                    <div key={sprint.id} className="flex-1 min-w-0 px-3 py-2">
                      <div className="font-semibold text-gray-800" style={{ fontSize: 14 }}>
                        {sprint.name ?? `Sprint ${sprint.number}`}
                      </div>
                      <div className="text-gray-500" style={{ fontSize: 11 }}>
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
                      className="rounded border overflow-hidden bg-white"
                      style={{ borderColor: vsColour.bg }}
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
                          <ChevronDown
                            size={14}
                            style={{
                              color: vsColour.text,
                              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                              transition: 'transform 200ms ease-out',
                            }}
                          />
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

                      {/*
                        grid-template-rows: 0fr → 1fr animates true height without
                        the max-height timing inaccuracy. Inner div needs overflow:hidden
                        to clip content during the collapse animation.
                      */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateRows: collapsed ? '0fr' : '1fr',
                          transition: collapsed
                            ? 'grid-template-rows 180ms ease-in'
                            : 'grid-template-rows 220ms ease-out',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          {/*
                            Each team is a block: full-width bar on top, sprint cells below.
                            divide-y on the container adds a hairline between teams.
                            divide-x on the sprint row aligns vertical dividers with the
                            sticky header's sprint cells above.
                          */}
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
                                    <span className="flex min-w-0 items-center gap-1.5">
                                      <ChevronDown
                                        size={12}
                                        className="shrink-0 text-gray-400"
                                        style={{
                                          transform: teamCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                          transition: 'transform 150ms ease-out',
                                        }}
                                      />
                                      <span className="truncate">
                                        <span className="font-medium text-gray-800" style={{ fontSize: 13 }}>
                                          <Highlight text={team.name} term={search} />
                                        </span>
                                        {(team.platform ?? (team.teamType ? formatTeamType(team.teamType) : null)) && (
                                          <span className="ml-1 font-normal text-gray-400" style={{ fontSize: 11 }}>
                                            (<Highlight text={team.platform ?? formatTeamType(team.teamType!)} term={search} />)
                                          </span>
                                        )}
                                      </span>
                                    </span>
                                    <span className="ml-2 shrink-0 text-xs text-gray-500">
                                      {team.features.length} features
                                    </span>
                                  </button>

                                  {/* Sprint cells — animated row below the team bar, tinted with VS colour */}
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateRows: teamCollapsed ? '0fr' : '1fr',
                                      transition: teamCollapsed
                                        ? 'grid-template-rows 130ms ease-in'
                                        : 'grid-template-rows 150ms ease-out',
                                    }}
                                  >
                                    <div style={{ overflow: 'hidden' }}>
                                      <div
                                        className="flex divide-x divide-gray-200 bg-white"
                                        style={{ borderLeft: `3px solid ${vsColour.text}` }}
                                      >
                                        {data.sprints.map((sprint) => (
                                          <SprintColumn
                                            key={`${team.id}-${sprint.id}`}
                                            sprint={sprint}
                                            features={team.features.filter(
                                              (feature) => feature.sprintId === sprint.id
                                            )}
                                            showHeader={false}
                                            searchTerm={search}
                                            className="flex-1 min-w-0 p-2 min-h-[80px]"
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
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

        <ParkingLotDrawer features={parking} />
      </div>
    </DndContext>
  );
}
