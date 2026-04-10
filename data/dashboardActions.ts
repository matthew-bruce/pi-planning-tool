import { type ThresholdStatus, convergenceThresholds } from './dashboardThresholds'

type ActionLookup = Record<ThresholdStatus, (...args: string[]) => string>

export const dashboardActions: Record<string, ActionLookup> = {
  convergence: {
    success: (_, stage) => {
      const label = convergenceThresholds[Number(stage)]?.label ?? ''
      return `On track for Stage ${stage}. Expected ${label}.`
    },
    warning: (pct, stage) => {
      const t = convergenceThresholds[Number(stage)]
      if (t && Number(pct) > t.successRange[1]) {
        return "Ahead of target for this stage — check teams aren't committing prematurely before business context is complete."
      }
      return Number(stage) <= 3
        ? 'Behind target — recoverable. Listen for teams waiting on a clarification.'
        : 'Lagging. Surface the bottom 3 teams by convergence on the Sorting Frame.'
    },
    danger: (_, stage) =>
      Number(stage) <= 3
        ? 'Significantly behind. Consider a 10-minute pause — ask every team to commit one feature, even tentatively.'
        : 'The room needs facilitator action now. Walk the room with Platform Leads and identify the top 3 blockers.',
  },
  parkingLot: {
    success: () => 'Parking lot is clear for this stage.',
    warning: () =>
      'Higher than expected. Teams should be clearing the lot before Draft Review closes.',
    danger: () =>
      'Each parked feature needs an explicit decision — committed, deferred, or dropped — before the event closes.',
  },
  dependencies: {
    success: () => 'Dependency health is good. No blocked items.',
    warning: () =>
      'Some dependencies at risk. Check named owners are in the room.',
    danger: () =>
      'Blocked high-criticality dependencies need resolution before the next breakout.',
  },
  freshness: {
    success: () => 'All sources current. Readings reflect live room state.',
    warning: () =>
      'Data is ageing. Trigger a refresh import via Admin if teams have made changes.',
    danger: () =>
      'Data is over an hour old. Readings may not reflect the live room — refresh via Admin.',
  },
  sprintLoad: {
    success: () => 'Load is evenly distributed across sprints.',
    warning: (sprint) =>
      `${sprint} is carrying significantly more than the median. Worth raising in Draft Review.`,
    danger: (sprint) =>
      `${sprint} has 3× the median load. Surface affected teams on Team Planning Room.`,
  },
}

export function getContextualReading(
  metric: string,
  status: ThresholdStatus,
  ...args: string[]
): string {
  const lookup = dashboardActions[metric]
  if (!lookup) return ''
  const fn = lookup[status]
  return fn(...args)
}
