import { SortingFrameBoard } from '@/components/sorting-frame/SortingFrameBoard';
import { getSortingFrameData } from '@/lib/supabase/sortingFrame';

export default async function SortingFramePage() {
  const data = await getSortingFrameData({});
  return <SortingFrameBoard initialData={data} />;
'use client';

import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDispatchStore } from '@/store/useDispatchStore';
import { SprintColumn } from '@/components/SprintColumn';
import { ParkingLotDrawer } from '@/components/ParkingLotDrawer';

export default function SortingFramePage() {
  const { selectedArtId, initiatives, teams, features, sprints, assignFeatureSprint } = useDispatchStore();
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const artInitiatives = initiatives.filter((i) => i.artId === selectedArtId);
  const filteredFeatures = features.filter((feature) => {
    const team = teams.find((t) => t.id === feature.teamId);
    const initiative = artInitiatives.some((i) => i.id === feature.initiativeId);
    const matchesPlatform = platformFilter === 'ALL' || team?.platform === platformFilter;
    const q = `${feature.ticketKey} ${feature.title}`.toLowerCase();
    return initiative && matchesPlatform && q.includes(search.toLowerCase());
  });

  const platforms = useMemo(() => ['ALL', ...new Set(teams.map((t) => t.platform))], [teams]);
  const parking = filteredFeatures.filter((f) => f.sprintId === null);

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;
    if (!over) return;
    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 mb-4">
        <select className="border rounded px-2 py-1" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
          {platforms.map((p) => (<option key={p}>{p}</option>))}
        </select>
        <input className="border rounded px-2 py-1" placeholder="Search ticket/title" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex">
        <div className="space-y-4 flex-1 overflow-x-auto pr-3">
          {artInitiatives.map((initiative) => {
            const initiativeFeatures = filteredFeatures.filter((f) => f.initiativeId === initiative.id);
            const initiativeTeams = teams.filter((team) => initiativeFeatures.some((f) => f.teamId === team.id));
            if (!initiativeFeatures.length) return null;
            const isCollapsed = collapsed[initiative.id];
            return (
              <section key={initiative.id} className="border rounded">
                <button className="w-full text-left bg-gray-100 p-2 font-semibold" onClick={() => setCollapsed((prev) => ({ ...prev, [initiative.id]: !prev[initiative.id] }))}>
                  {initiative.name} {isCollapsed ? '▸' : '▾'}
                </button>
                {!isCollapsed && (
                  <div className="p-2 space-y-3">
                    {initiativeTeams.map((team) => {
                      const lane = initiativeFeatures.filter((f) => f.teamId === team.id);
                      return (
                        <div key={team.id}>
                          <h4 className="text-sm font-semibold mb-2">{team.name} <span className="text-xs text-gray-500">({team.platform})</span></h4>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {sprints.map((sprint) => (
                              <SprintColumn key={`${team.id}-${sprint.id}`} sprint={sprint} features={lane.filter((f) => f.sprintId === sprint.id)} />
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
