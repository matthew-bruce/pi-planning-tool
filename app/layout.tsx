import './globals.css';
import 'reactflow/dist/style.css';
import { DispatchShell } from '@/components/DispatchShell';
import { getActiveOrSelectedProgramIncrement } from '@/lib/supabase/shared';

// Fetched once per request at the layout level so the Planning Stage pill
// in the planning header has current_stage on every planning page without
// each page having to thread it through. The pages themselves use the same
// helper for their own data needs — the shared row type means we always
// resolve the same Program Increment.
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cycle = await getActiveOrSelectedProgramIncrement().catch(() => null);

  return (
    <html lang="en">
      <body>
        <DispatchShell
          cycleId={cycle?.id ?? null}
          currentStage={cycle?.current_stage ?? null}
        >
          {children}
        </DispatchShell>
      </body>
    </html>
  );
}
