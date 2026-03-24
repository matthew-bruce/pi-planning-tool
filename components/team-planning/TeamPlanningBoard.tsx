'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Inbox } from 'lucide-react';
import { formatSprintRange } from '@/lib/utils';
import type {
  TeamPlanningData,
  TeamPlanningFeatureGroup,
  TeamPlanningStory,
} from '@/lib/supabase/teamPlanning';
import { useDispatchStore } from '@/store/useDispatchStore';
import { stripFeaturePrefix } from '@/lib/stripFeaturePrefix';

type Props = { initialData: TeamPlanningData };

// ─── Colour constants ─────────────────────────────────────────────────────────

const VS_COLOURS = [
  { bg: '#fce7e7', text: '#991b1b' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#fce7f3', text: '#831843' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#f0fdf4', text: '#14532d' },
  { bg: '#f0f9ff', text: '#0c4a6e' },
  { bg: '#f5f3ff', text: '#4c1d95' },
];

const PLATFORM_BORDER: Record<string, string> = {
  WEB: '#60a5fa',  // blue-400
  APP: '#c084fc',  // purple-400
  EPS: '#fb923c',  // orange-400
  PDA: '#2dd4bf',  // teal-400
  BIG: '#eab308',  // yellow-500
  ETP: '#4ade80',  // green-400
};

function platformBorderColor(platform: string | null): string {
  if (!platform) return '#d1d5db'; // gray-300
  return PLATFORM_BORDER[platform.toUpperCase()] ?? '#d1d5db';
}

// ─── Small presentational helpers ────────────────────────────────────────────

function storyStatusColor(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done') return '#16a34a';
  if (s === 'in progress') return '#d97706';
  if (s === 'blocked') return '#dc2626';
  return '#9ca3af';
}

function getCommitmentPill(commitmentStatus: string | null | undefined) {
  const s = (commitmentStatus ?? '').toLowerCase();
  if (s === 'committed')
    return { label: 'Committed', cls: 'bg-green-100 text-green-700' };
  if (s === 'planned')
    return { label: 'Planned', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'Draft', cls: 'bg-gray-100 text-gray-600' };
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
    <div className="flex items-start gap-1.5 py-1 px-1 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: storyStatusColor(story.status),
          flexShrink: 0,
          marginTop: 4,
        }}
      />
      <div className="min-w-0 flex-1">
        <span
          className="font-mono shrink-0"
          style={{ fontSize: 10, color: '#991b1b', opacity: 0.8 }}
        >
          {story.ticketKey}
        </span>{' '}
        {story.sourceUrl ? (
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:underline leading-snug"
            style={{ fontSize: 12 }}
          >
            {displayTitle}
          </a>
        ) : (
          <span className="text-gray-700 leading-snug" style={{ fontSize: 12 }}>
            {displayTitle}
          </span>
        )}
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

// ─── Feature group (sub-header + collapsible stories) ────────────────────────

function FeatureGroup({
  group,
  vsColour,
  collapsed,
  onToggle,
}: {
  group: TeamPlanningFeatureGroup;
  vsColour: { bg: string; text: string };
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pill = getCommitmentPill(group.featureCommitmentStatus);
  const isUnassigned = group.featureId === 'unassigned';

  return (
    <div className="mb-2">
      {/* Feature sub-header */}
      <button
        className="w-full text-left rounded px-1.5 py-1 mb-0.5"
        style={{ backgroundColor: vsColour.bg }}
        onClick={onToggle}
        disabled={isUnassigned}
      >
        {!isUnassigned && (
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span
              className="font-mono shrink-0"
              style={{ fontSize: 9, color: vsColour.text, opacity: 0.85 }}
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
        <div className="flex items-center gap-1 min-w-0">
          {!isUnassigned && (
            <ChevronDown
              size={10}
              style={{
                flexShrink: 0,
                color: vsColour.text,
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease-out',
              }}
            />
          )}
          <span
            className="truncate font-medium leading-snug"
            style={{
              fontSize: 11,
              color: isUnassigned ? '#9ca3af' : vsColour.text,
              fontStyle: isUnassigned ? 'italic' : undefined,
            }}
            title={group.featureTitle}
          >
            {group.featureTitle}
          </span>
        </div>
      </button>

      {/* Stories — animated collapse */}
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
          {group.stories.length === 0 ? (
            <div
              className="flex items-center gap-1 px-1 py-1"
              style={{ color: '#d1d5db', fontSize: 11 }}
            >
              <span className="italic">No stories</span>
            </div>
          ) : (
            group.stories.map((story) => (
              <StoryRow
                key={story.id}
                story={story}
                featureTitle={group.featureTitle}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty sprint cell ────────────────────────────────────────────────────────

function EmptyCell() {
  return (
    <div className="flex flex-col min-h-[48px] items-center justify-center gap-0.5">
      <Inbox size={16} className="text-gray-200" />
      <span className="text-gray-300" style={{ fontSize: 11 }}>
        Empty
      </span>
    </div>
  );
}

// ─── Main board ───────────────────────────────────────────────────────────────

export function TeamPlanningBoard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  // collapsedFeatures: featureId → boolean (true = collapsed)
  const [collapsedFeatures, setCollapsedFeatures] = useState<
    Record<string, boolean>
  >({});
  const [collapsedTeams, setCollapsedTeams] = useState<
    Record<string, boolean>
  >({});

  const { selectedArtId, setSelectedArtId, setArts } = useDispatchStore();

  // Sync store when server-rendered initialData arrives.
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

  // ── VS colour map: sorted unique VS names → stable colour index ──────────
  const vsColorIndex = (() => {
    const names = new Set<string>();
    for (const team of data.teams) {
      for (const col of team.sprintColumns)
        for (const g of col.featureGroups)
          if (g.valueStreamName) names.add(g.valueStreamName);
      for (const g of team.parkingLotFeatureGroups)
        if (g.valueStreamName) names.add(g.valueStreamName);
    }
    const sorted = [...names].sort();
    return new Map(sorted.map((n, i) => [n, i]));
  })();

  function getVsColour(vsName: string | null) {
    if (!vsName) return { bg: '#f3f4f6', text: '#374151' };
    const idx = vsColorIndex.get(vsName) ?? 0;
    return VS_COLOURS[idx % VS_COLOURS.length];
  }

  function toggleFeature(featureId: string) {
    setCollapsedFeatures((prev) => ({
      ...prev,
      [featureId]: !prev[featureId],
    }));
  }

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

      {/* ── Board (horizontally scrollable) ──────────────────────────────── */}
      <div className="overflow-x-auto">
        {noTeams ? (
          <div className="rounded border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 text-center">
            No teams with assigned stories found for the selected ART and Program
            Increment.
          </div>
        ) : (
          <div style={{ minWidth: `${data.sprints.length * 180 + 200}px` }}>
            {/*
              Sticky sprint header — appears once, sticks to viewport top.
              The flex layout mirrors every team row exactly for column alignment.
            */}
            <div
              className="sticky top-0 z-30 mb-2 border-b border-gray-200 shadow-sm"
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <div className="flex divide-x divide-gray-200 px-px">
                {data.sprints.map((sprint) => (
                  <div
                    key={sprint.id}
                    className="flex-1 px-3 py-2"
                    style={{ minWidth: 180 }}
                  >
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
                {/* Parking lot header column */}
                <div
                  className="flex-none px-3 py-2"
                  style={{ minWidth: 200 }}
                >
                  <div
                    className="font-semibold text-gray-500"
                    style={{ fontSize: 14 }}
                  >
                    Parking Lot
                  </div>
                  <div className="text-gray-400" style={{ fontSize: 11 }}>
                    No sprint assigned
                  </div>
                </div>
              </div>
            </div>

            {/* Team sections */}
            <div className="space-y-3">
              {data.teams.map((team) => {
                const teamCollapsed = collapsedTeams[team.id];
                const borderColor = platformBorderColor(team.platform);

                return (
                  <section
                    key={team.id}
                    className="rounded border border-gray-200 overflow-hidden bg-white"
                    style={{ borderLeft: `3px solid ${borderColor}` }}
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
                            transform: teamCollapsed
                              ? 'rotate(-90deg)'
                              : 'rotate(0deg)',
                            transition: 'transform 150ms ease-out',
                          }}
                        />
                        <span
                          className="font-semibold text-gray-800"
                          style={{ fontSize: 14 }}
                        >
                          {team.name}
                        </span>
                        {team.platform && (
                          <span
                            className="text-gray-400 font-normal"
                            style={{ fontSize: 12 }}
                          >
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

                    {/* Sprint columns + parking lot — animated collapse */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: teamCollapsed ? '0fr' : '1fr',
                        transition: teamCollapsed
                          ? 'grid-template-rows 150ms ease-in'
                          : 'grid-template-rows 180ms ease-out',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div className="flex divide-x divide-gray-200">
                          {/* Sprint columns */}
                          {team.sprintColumns.map((col) => (
                            <div
                              key={col.sprintId}
                              className="flex-1 p-2"
                              style={{ minWidth: 180, minHeight: 60 }}
                            >
                              {col.featureGroups.length === 0 ? (
                                <EmptyCell />
                              ) : (
                                col.featureGroups.map((group) => (
                                  <FeatureGroup
                                    key={group.featureId}
                                    group={group}
                                    vsColour={getVsColour(group.valueStreamName)}
                                    collapsed={
                                      collapsedFeatures[group.featureId] ?? false
                                    }
                                    onToggle={() => toggleFeature(group.featureId)}
                                  />
                                ))
                              )}

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

                          {/* Parking lot column */}
                          <div
                            className="flex-none p-2"
                            style={{
                              minWidth: 200,
                              minHeight: 60,
                              backgroundColor: '#f9fafb',
                            }}
                          >
                            {team.parkingLotFeatureGroups.length === 0 ? (
                              <EmptyCell />
                            ) : (
                              team.parkingLotFeatureGroups.map((group) => (
                                <FeatureGroup
                                  key={group.featureId}
                                  group={group}
                                  vsColour={getVsColour(group.valueStreamName)}
                                  collapsed={
                                    collapsedFeatures[group.featureId] ?? false
                                  }
                                  onToggle={() => toggleFeature(group.featureId)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
