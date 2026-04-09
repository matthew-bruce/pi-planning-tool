type Props = {
  title: string
  description: string
  children: React.ReactNode
}

export function ConceptualTile({ title, description, children }: Props) {
  return (
    <article className="relative overflow-hidden rounded border border-border bg-surface p-4">
      {/* Diagonal stripe overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(0,0,0,0.04) 6px, rgba(0,0,0,0.04) 10px)',
        }}
      />

      <div className="relative">
        {/* Header with CONCEPT badge */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-textPrimary">{title}</h3>
            <p className="mt-0.5 text-xs text-textMuted">{description}</p>
          </div>
          <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-textMuted">
            Concept
          </span>
        </div>

        {/* Content */}
        <div className="space-y-3">{children}</div>

        {/* Footer note */}
        <p className="mt-4 border-t border-border pt-2 text-xs text-textMuted">
          This section shows placeholder data. Live integration is planned for a
          future release.
        </p>
      </div>
    </article>
  )
}
