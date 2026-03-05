'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDispatchStore } from '@/store/useDispatchStore';
import { SprintColumn } from '@/components/SprintColumn';

export default function TeamPlanningPage() {
  const { selectedArtId, initiatives, teams, features, sprints, assignFeatureSprint } = useDispatchStore();
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const sensors = useSensors(useSensor(PointerSensor));

  const artInitiativeIds = initiatives.filter((i) => i.artId === selectedArtId).map((i) => i.id);
  const scopedFeatures = features.filter((f) => artInitiativeIds.includes(f.initiativeId));

  const groupedByPlatform = Object.entries(
    teams.reduce<Record<string, typeof teams>>((acc, team) => {
      if (!acc[team.platform]) acc[team.platform] = [];
      acc[team.platform].push(team);
      return acc;
    }, {}),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const featureId = String(event.active.id);
    const over = event.over?.id ? String(event.over.id) : null;
    if (!over) return;
    assignFeatureSprint(featureId, over === 'parking-lot' ? null : over);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {groupedByPlatform.map(([platform, platformTeams]) => {
          const activeTeams = platformTeams.filter((t) => scopedFeatures.some((f) => f.teamId === t.id));
          if (!activeTeams.length) return null;
          return (
            <section key={platform} className="border rounded p-2">
              <h2 className="font-semibold text-royalRed mb-2">Platform: {platform}</h2>
              <div className="space-y-3">
                {activeTeams.map((team) => {
                  const teamFeatures = scopedFeatures.filter((f) => f.teamId === team.id);
                  const isCollapsed = collapsedTeams[team.id];
                  return (
                    <div key={team.id} className="border rounded">
                      <button className="w-full text-left p-2 bg-gray-50" onClick={() => setCollapsedTeams((prev) => ({ ...prev, [team.id]: !prev[team.id] }))}>
                        {team.name} {isCollapsed ? '▸' : '▾'}
                      </button>
                      {!isCollapsed && (
                        <div className="p-2 flex gap-2 overflow-x-auto">
                          {sprints.map((sprint) => (
                            <SprintColumn key={`${team.id}-${sprint.id}`} sprint={sprint} features={teamFeatures.filter((f) => f.sprintId === sprint.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
