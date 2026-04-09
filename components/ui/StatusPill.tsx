// StatusPill — canonical commitment status badge.
// Single source of truth for committed / planned / draft colours.
// Use semantic design tokens: success / warning / neutral.

type Status = 'committed' | 'planned' | 'draft';

const PILL_CLASSES: Record<Status, string> = {
  committed: 'bg-green-100 text-green-700',
  planned:   'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
};

const PILL_LABELS: Record<Status, string> = {
  committed: 'Committed',
  planned:   'Planned',
  draft:     'Draft',
};

// Canonical colour values for non-pill uses (e.g. convergence bar fills).
// Sourced from the same semantic tokens so they stay in sync.
export const STATUS_COLOURS = {
  committed: { bar: 'bg-green-600', hex: '#16a34a' },
  planned:   { bar: 'bg-blue-500',  hex: '#3b82f6' },
  draft:     { bar: 'bg-amber-400', hex: '#fbbf24' },
} satisfies Record<Status, { bar: string; hex: string }>;

function normalise(raw: string | null | undefined): Status {
  const s = (raw ?? '').toLowerCase();
  if (s === 'committed') return 'committed';
  if (s === 'planned')   return 'planned';
  return 'draft';
}

type Props = {
  status: string | null | undefined;
  /** Additional Tailwind classes — e.g. a larger text size. */
  className?: string;
};

export function StatusPill({ status, className = '' }: Props) {
  const s = normalise(status);
  return (
    <span
      className={[
        'rounded-full px-2 py-0.5 text-[10px] font-medium',
        PILL_CLASSES[s],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {PILL_LABELS[s]}
    </span>
  );
}

/** Utility — returns the Tailwind pill classes for a given raw status string.
 *  Use this when you need the classes without rendering the component. */
export function getStatusPillClasses(raw: string | null | undefined): { label: string; cls: string } {
  const s = normalise(raw);
  return { label: PILL_LABELS[s], cls: PILL_CLASSES[s] };
}
