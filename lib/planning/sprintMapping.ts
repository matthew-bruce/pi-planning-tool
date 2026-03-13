import { Sprint } from '@/lib/admin/types';

export function getCycleSprintNames(sprints: Sprint[], planningCycleId: string): string[] {
  return sprints
    .filter((sprint) => sprint.planning_cycle_id === planningCycleId)
    .map((sprint) => sprint.name);
}

export function buildSprintNameSet(sprintNames: string[]): Set<string> {
  return new Set(sprintNames);
}

export function isSprintMappedToCycle(sprintName: string, cycleSprintNames: Set<string>): boolean {
  return cycleSprintNames.has(sprintName);
}
