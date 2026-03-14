'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useDispatchStore } from '@/store/useDispatchStore';

const planningNavItems = [
  { href: '/sorting-frame', label: 'Sorting Frame' },
  { href: '/team-planning', label: 'Team Planning Room' },
  { href: '/dependencies', label: 'Dependencies Near You' },
  { href: '/dashboard', label: 'Live Dashboard' },
  { href: '/triage', label: 'Bulk Triage' },
  { href: '/help', label: 'Help' },
];

export function DispatchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  const {
    arts,
    selectedArtId,
    setSelectedArtId,
    demoMode,
    setDemoMode,
    density,
    setDensity,
    hydrateSeed,
    runSimulationTick,
  } = useDispatchStore();

  useEffect(() => {
    hydrateSeed();
  }, [hydrateSeed]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = (8 + Math.random() * 7) * 1000;
      timeoutId = setTimeout(() => {
        runSimulationTick();
        schedule();
      }, delay);
    };

    schedule();

    return () => clearTimeout(timeoutId);
  }, [runSimulationTick]);

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="flex min-h-screen flex-col border-r border-gray-200 bg-gray-50 p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-royalRed">Dispatch</h1>
          <p className="mt-1 text-xs text-gray-500">
            PI Planning orchestration
          </p>
        </div>

        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Planning
        </div>

        <nav className="space-y-1">
          {planningNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-royalRed text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Configuration
          </div>

          <Link
            href="/admin"
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
              isAdmin
                ? 'border-royalRed bg-white text-royalRed'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings size={16} />
            <span>Admin</span>
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        {!isAdmin ? (
          <header className="flex flex-wrap items-center gap-4 border-b border-gray-200 p-4">
            <div className="flex items-center gap-2">
              {arts.map((art) => (
                <button
                  key={art.id}
                  onClick={() => setSelectedArtId(art.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedArtId === art.id
                      ? 'border-royalRed bg-royalRed text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {art.name}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <span>Demo Mode</span>
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
              />
            </label>

            <div className="flex items-center gap-2 text-sm">
              <span>Density</span>
              <button
                onClick={() => setDensity('compact')}
                className={`rounded px-2 py-1 ${
                  density === 'compact'
                    ? 'bg-royalRed text-white'
                    : 'bg-gray-100'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setDensity('detailed')}
                className={`rounded px-2 py-1 ${
                  density === 'detailed'
                    ? 'bg-royalRed text-white'
                    : 'bg-gray-100'
                }`}
              >
                Detailed
              </button>
            </div>
          </header>
        ) : (
          <header className="border-b border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Admin Control Centre
                </h2>
                <p className="text-sm text-gray-500">
                  Configure cycles, sprints, ARTs, platforms, teams,
                  initiatives, and imports.
                </p>
              </div>

              <Link
                href="/sorting-frame"
                className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Return to planning
              </Link>
            </div>
          </header>
        )}

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
