'use client';

import { useMemo, useState, useEffect } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ParkingLotDrawer } from '@/components/ParkingLotDrawer';
import { SprintColumn } from '@/components/SprintColumn';
import { SortingFrameData } from '@/lib/supabase/sortingFrame';
import { useDispatchStore } from '@/store/useDispatchStore';

type Props = { initialData: SortingFrameData };

export function SortingFrameBoard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collapsedInitiatives, setCollapsedInitiatives] = useState<Record<string, boolean>>({});
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const { density, selectedArtId, setSelectedArtId, assignFeatureSprint, setArts } = useDispatchStore();

  useEffect(() => {
    setArts(initialData.arts);
    if (initialData.selectedArtId && initialData.selectedArtId !== selectedArtId) {
      setSelectedArtId(initialData.selectedArtId);
    }
    setData(initialData);
  }, [initialData, selectedArtId, setArts, setSelectedArtId]);

  useEffect(() => {
    if (!selectedArtId || selectedArtId === data.selectedArtId) return;

    const params = new URLSearchParams({ artId: selectedArtId });
    if (data.cycle?.id) params.set('cycleId', data.cycle.id);

    let cancelled = false;
    setLoading(true);

    fetch(`/api/sorting-frame?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: SortingFrameData) => {
        if (cancelled) return;
        setData(payload);
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
              const target = `${feature.ticketKey} ${feature.title}`.toLowerCase();
              return target.includes(lower);
            }),
          }))
          .filter((team) => team.features.length > 0);

        const featuresCount = teams.reduce((sum, team) => sum + team.features.length, 0);
        const dependencyCount = teams.reduce(
          (sum, team) =>
            sum +
            team.features.reduce(
              (featureSum, feature) =>
                featureSum + feature.dependencyCounts.requires + feature.dependencyCounts.blocks + feature.dependencyCounts.conflict,
              0,
            ),
          0,
        );
        const conflictCount = teams.reduce(
          (sum, team) => sum + team.features.reduce((featureSum, feature) => featureSum + feature.dependencyCounts.conflict, 0),
          0,
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

  const parking = useMemo(
    () =>
      data.parkingLot.filter((feature) => {
        const textMatch = `${feature.ticketKey} ${feature.title}`.toLowerCase().includes(search.toLowerCase());
        if (!textMatch) return false;
        if (platformFilter === 'ALL') return true;
        const team = data.initiatives.flatMap((initiative) => initiative.teams).find((lane) => lane.id === feature.teamId);
        return team?.platform === platformFilter;
      }),
    [data.initiatives, data.parkingLot, platformFilter, search],
  );

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;
    if (!over) return;
    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

  if (!data.cycle) {
    return <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">No active planning cycle configured.</div>;
  }

  if (!data.sprints.length) {
    return <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">No sprints configured for {data.cycle.name}.</div>;
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-4 rounded border border-gray-200 bg-white p-3 text-sm">
        <div className="font-semibold text-gray-800">{data.cycle.name} {loading ? '• Loading...' : ''}</div>
        <div className="text-xs text-gray-500">{new Date(data.cycle.start_date).toLocaleDateString('en-GB')} - {new Date(data.cycle.end_date).toLocaleDateString('en-GB')}</div>
      </div>

      <div className="mb-4 flex gap-3">
        <select className="border rounded px-2 py-1" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          <option value="ALL">All platforms</option>
          {data.availablePlatforms.map((platform) => (
            <option key={platform} value={platform}>{platform}</option>
          ))}
        </select>
        <input className="border rounded px-2 py-1" placeholder="Search ticket/title" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="self-center text-xs text-gray-500">Density: {density}</div>
      </div>

      <div className="flex">
        <div className="flex-1 space-y-4 overflow-x-auto pr-3">
          {!filteredInitiatives.length ? (
            <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">No initiatives or features for the selected ART.</div>
          ) : (
            filteredInitiatives.map((initiative) => {
              const collapsed = collapsedInitiatives[initiative.id];
              return (
                <section key={initiative.id} className="rounded border border-gray-200 bg-white">
                  <button
                    className="flex w-full items-center justify-between bg-gray-50 p-2 text-left"
                    onClick={() => setCollapsedInitiatives((prev) => ({ ...prev, [initiative.id]: !prev[initiative.id] }))}
                  >
                    <span className="font-semibold">{initiative.name}</span>
                    <span className="text-xs text-gray-500">Teams {initiative.summary.teamsCount} • Features {initiative.summary.featuresCount} • Deps {initiative.summary.dependencyCount} • Conflicts {initiative.summary.conflictCount} {collapsed ? '▸' : '▾'}</span>
                  </button>

                  {!collapsed && (
                    <div className="space-y-4 p-3">
                      {initiative.teams.map((team) => {
                        const teamCollapsed = collapsedTeams[`${initiative.id}-${team.id}`];
                        return (
                          <div key={team.id}>
                            <button
                              className="mb-2 flex w-full items-center justify-between rounded border border-gray-200 bg-white px-2 py-1 text-left"
                              onClick={() =>
                                setCollapsedTeams((prev) => ({
                                  ...prev,
                                  [`${initiative.id}-${team.id}`]: !prev[`${initiative.id}-${team.id}`],
                                }))
                              }
                            >
                              <span className="text-sm font-semibold">{team.name} <span className="text-xs text-gray-500">({team.platform})</span></span>
                              <span className="text-xs text-gray-500">{team.features.length} features {teamCollapsed ? '▸' : '▾'}</span>
                            </button>
                            {!teamCollapsed && (
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {data.sprints.map((sprint) => (
                                  <SprintColumn key={`${team.id}-${sprint.id}`} sprint={sprint} features={team.features.filter((feature) => feature.sprintId === sprint.id)} />
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
            })
          )}
        </div>
        <ParkingLotDrawer features={parking} />
      </div>
    </DndContext>
  );
}
