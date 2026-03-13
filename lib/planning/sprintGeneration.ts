import { GeneratedSprintPreview } from '@/lib/admin/types';

const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export type SprintGenerationInput = {
  startDate: string;
  sprintCount: number;
  sprintLengthDays: number;
  latestSprintNumber: number;
};

export function generateSprintPreview(input: SprintGenerationInput): GeneratedSprintPreview[] {
  const base = asDate(input.startDate);

  return Array.from({ length: input.sprintCount }).map((_, index) => {
    const sprintNumber = input.latestSprintNumber + index + 1;
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() + index * input.sprintLengthDays);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + input.sprintLengthDays - 1);

    return {
      sprint_number: sprintNumber,
      name: `Sprint ${sprintNumber}`,
      start_date: toIsoDate(start),
      end_date: toIsoDate(end),
    };
  });
}
