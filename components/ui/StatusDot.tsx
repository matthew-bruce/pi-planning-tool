// StatusDot — story workflow status indicator dot.
// Canonical 8px default. Use semantic token colours.

function storyStatusColor(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'done')        return '#16a34a'; // success
  if (s === 'in progress') return '#d97706'; // warning
  if (s === 'blocked')     return '#dc2626'; // danger
  return '#9ca3af';                          // neutral (To Do / unknown)
}

type Props = {
  status: string | null;
  /** Dot diameter in px. Default: 8. */
  size?: number;
};

export function StatusDot({ status, size = 8 }: Props) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: storyStatusColor(status),
        flexShrink: 0,
      }}
    />
  );
}
