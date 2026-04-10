import { getStageById } from '@/lib/planning/stages';

type Props = {
  stage: number | null;
};

/**
 * Passive stage indicator for the planning header — shows the current
 * stage as read-only text. No dropdown, no interaction.
 */
export function StageIndicator({ stage }: Props) {
  const def = getStageById(stage);
  if (!def) return null;

  return (
    <span className="text-sm text-white/80">
      Stage {def.id} · {def.shortLabel}
    </span>
  );
}
