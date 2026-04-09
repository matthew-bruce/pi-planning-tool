export type ThresholdStatus = 'success' | 'warning' | 'danger'

export interface StageThreshold {
  successRange: [number, number]  // inclusive [min, max] percentage
  label: string
}

export const convergenceThresholds: Record<number, StageThreshold> = {
  1: { successRange: [0, 10],   label: '0–10%' },
  2: { successRange: [40, 70],  label: '40–70%' },
  3: { successRange: [70, 85],  label: '70–85%' },
  4: { successRange: [85, 95],  label: '85–95%' },
  5: { successRange: [95, 100], label: '95–100%' },
  6: { successRange: [100, 100],label: '100%' },
}

export const parkingLotThresholds: Record<number, { warningCount: number; dangerCount: number }> = {
  1: { warningCount: 999, dangerCount: 999 },
  2: { warningCount: 15,  dangerCount: 25  },
  3: { warningCount: 10,  dangerCount: 15  },
  4: { warningCount: 5,   dangerCount: 10  },
  5: { warningCount: 2,   dangerCount: 5   },
  6: { warningCount: 1,   dangerCount: 2   },
}

export function getConvergenceStatus(pct: number, stage: number): ThresholdStatus {
  const t = convergenceThresholds[stage] ?? convergenceThresholds[3]
  if (pct >= t.successRange[0] && pct <= t.successRange[1]) return 'success'
  if (stage === 1 && pct > 10) return 'warning'  // early over-committing
  const gap = t.successRange[0] - pct
  return gap > 15 ? 'danger' : 'warning'
}

export function getParkingLotStatus(count: number, stage: number): ThresholdStatus {
  const t = parkingLotThresholds[stage] ?? parkingLotThresholds[3]
  if (count >= t.dangerCount) return 'danger'
  if (count >= t.warningCount) return 'warning'
  return 'success'
}
