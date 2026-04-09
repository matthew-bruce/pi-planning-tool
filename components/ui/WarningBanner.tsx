// WarningBanner — amber notice for empty/misconfigured states.
// Pattern: rounded border border-yellow-300 bg-yellow-50 p-4 text-sm

type Props = {
  children: React.ReactNode;
};

export function WarningBanner({ children }: Props) {
  return (
    <div className="rounded border border-yellow-300 bg-yellow-50 p-4 text-sm">
      {children}
    </div>
  );
}
