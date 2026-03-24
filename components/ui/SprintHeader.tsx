// SprintHeader — sticky board header row showing sprint names and date ranges.
// Used identically on Sorting Frame and Team Planning Room.

import { formatSprintRange } from '@/lib/utils';

type Sprint = {
  id: string;
  name: string | null | undefined;
  number: number;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
};

type Props = {
  sprints: Sprint[];
};

export function SprintHeader({ sprints }: Props) {
  return (
    <div className="sticky top-0 z-30 mb-2 border-b border-gray-200 bg-gray-100 shadow-sm">
      <div className="flex divide-x divide-gray-200 px-px">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="min-w-0 flex-1 px-3 py-2">
            <div className="text-sm font-semibold text-gray-800">
              {sprint.name ?? `Sprint ${sprint.number}`}
            </div>
            {sprint.startDate && sprint.endDate && (
              <div className="text-[11px] text-gray-500">
                {formatSprintRange(sprint.startDate, sprint.endDate)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
