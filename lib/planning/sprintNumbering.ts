import { Sprint } from '@/lib/admin/types';

export function getLatestSprintNumber(sprints: Sprint[]): number {
  return sprints.reduce((max, sprint) => Math.max(max, sprint.sprint_number), 0);
}

export function getNextSprintNumber(latestSprintNumber: number): number {
  return latestSprintNumber + 1;
}
