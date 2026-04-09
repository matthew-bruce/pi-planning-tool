// PageHeader — canonical page title + subtitle + actions row.
// Used on every planning page: Sorting Frame, Team Planning, Dashboard,
// Dependencies, Activity, Triage.

type Props = {
  title: string;
  /** Optional subtitle line — typically PI name + date range. */
  subtitle?: React.ReactNode;
  /** Right-aligned controls: filters, toggles, refresh buttons, etc. */
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {subtitle && (
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}
