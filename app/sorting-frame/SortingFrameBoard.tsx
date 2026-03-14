'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDispatchStore } from '@/store/useDispatchStore';
import { SprintColumn } from '@/components/SprintColumn';
import { ParkingLotDrawer } from '@/components/ParkingLotDrawer';

type SortingFrameBoardProps = {
  initialData: {
    selectedArtId?: string | null;
    initiatives?: any[];
    teams?: any[];
    features?: any[];
    sprints?: any[];
  };
};

export function SortingFrameBoard({
  initialData,
}: SortingFrameBoardProps) {
  const {
    selectedArtId,
    initiatives,
    teams,
    features,
    sprints,
    assignFeatureSprint,
  } = useDispatchStore();

  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const activeArtId = selectedArtId ?? initialData.selectedArtId ?? null;
  const safeInitiatives = initiatives?.length ? initiatives : initialData.initiatives ?? [];
  const safeTeams = teams?.length ? teams : initialData.teams ?? [];
  const safeFeatures = features?.length ? features : initialData.features ?? [];
  const safeSprints = sprints?.length ? sprints : initialData.sprints ?? [];

  const artInitiatives = safeInitiatives.filter(
    (initiative) => initiative.artId === activeArtId
  );

  const filteredFeatures = safeFeatures.filter((feature) => {
    const team = safeTeams.find((t) => t.id === feature.teamId);
    const initiativeInArt = artInitiatives.some(
      (initiative) => initiative.id === feature.initiativeId
    );
    const matchesPlatform =
      platformFilter === 'ALL' || team?.platform === platformFilter;
    const q = `${feature.ticketKey ?? ''} ${feature.title ?? ''}`.toLowerCase();

    return initiativeInArt && matchesPlatform && q.includes(search.toLowerCase());
  });

  const platforms = useMemo(
    () => ['ALL', ...new Set(safeTeams.map((team) => team.platform).filter(Boolean))],
    [safeTeams]
  );

  const parking = filteredFeatures.filter((feature) => feature.sprintId === null);

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;

    if (!over) return;

    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="mb-4 flex gap-3">
        <select
          className="rounded border px-2 py-1"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <input
          className="rounded border px-2 py-1"
          placeholder="Search ticket/title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex">
        <div className="flex-1 space-y-4 overflow-x-auto pr-3">
          {artInitiatives.map((initiative) => {
            const initiativeFeatures = filteredFeatures.filter(
              (feature) => feature.initiativeId === initiative.id
            );

            const initiativeTeams = safeTeams.filter((team) =>
              initiativeFeatures.some((feature) => feature.teamId === team.id)
            );

            if (!initiativeFeatures.length) return null;

            const isCollapsed = collapsed[initiative.id];

            return (
              <section key={initiative.id} className="rounded border">
                <button
                  className="w-full bg-gray-100 p-2 text-left font-semibold"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [initiative.id]: !prev[initiative.id],
                    }))
                  }
                >
                  {initiative.name} {isCollapsed ? '▸' : '▾'}
                </button>

                {!isCollapsed && (
                  <div className="space-y-3 p-2">
                    {initiativeTeams.map((team) => {
                      const lane = initiativeFeatures.filter(
                        (feature) => feature.teamId === team.id
                      );

                      return (
                        <div key={team.id}>
                          <h4 className="mb-2 text-sm font-semibold">
                            {team.name}{' '}
                            <span className="text-xs text-gray-500">
                              ({team.platform})
                            </span>
                          </h4>

                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {safeSprints.map((sprint) => (
                              <SprintColumn
                                key={`${team.id}-${sprint.id}`}
                                sprint={sprint}
                                features={lane.filter(
                                  (feature) => feature.sprintId === sprint.id
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <ParkingLotDrawer features={parking} />
      </div>
    </DndContext>
  );
}
