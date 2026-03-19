'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useDispatchStore } from '@/store/useDispatchStore';
import { ActivityFeedPanel } from '@/components/ActivityFeedPanel';

const planningNavItems = [
  { href: '/sorting-frame', label: 'Sorting Frame' },
  { href: '/team-planning', label: 'Team Planning Room' },
  { href: '/dependencies', label: 'Dependencies Near You' },
  { href: '/dashboard', label: 'Live Dashboard' },
  { href: '/activity', label: 'Activity' },
  { href: '/triage', label: 'Bulk Triage' },
  { href: '/help', label: 'Help' },
];

export function DispatchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isHelp = pathname === '/help' || pathname.startsWith('/help/');
  const showPlanningHeader = !isAdmin && !isHelp;
  const showActivityPanel = !isAdmin && !isHelp;

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
    <div className="min-h-screen">
      {/* ── Fixed Sidebar ── */}
      <aside
        className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-gray-200 bg-white"
        style={{ padding: '1rem' }}
      >
        {/* Brand area */}
        <div className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Royal_Mail_logo_2024.svg"
            alt="Royal Mail"
            height="36"
            style={{ height: 36 }}
            className="mb-2"
          />
          <h1 className="text-2xl font-bold text-royalRed">Dispatch</h1>
          <p className="mt-1 text-xs text-gray-500">PI Planning orchestration</p>
        </div>

        {/* Royal Mail stripe accent */}
        <div
          className="my-4 h-1 w-full shrink-0 rounded-full"
          style={{
            background:
              'linear-gradient(to right, #EE2722, #EE2722, #FDDD1C, #f97316, #fca5a5)',
          }}
        />

        {/* Planning nav label */}
        <div className="mb-2 shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Planning
        </div>

        {/* Planning nav — scrollable if needed */}
        <nav className="flex-1 overflow-y-auto space-y-1">
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

        {/* Config items — always pinned to bottom */}
        <div className="mt-auto shrink-0 pt-4">
          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Configuration
          </div>

          {/* Demo Mode toggle */}
          <div className="mb-2 flex items-center justify-between rounded border border-gray-200 px-3 py-2">
            <div>
              <div className="text-sm text-gray-700">Demo Mode</div>
              {demoMode && (
                <div className="text-xs text-amber-700">Simulated data</div>
              )}
            </div>
            <button
              role="switch"
              aria-checked={demoMode}
              onClick={() => setDemoMode(!demoMode)}
              className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none"
              style={{ backgroundColor: demoMode ? '#FDDD1C' : '#d1d5db' }}
            >
              <span
                className="pointer-events-none mt-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: demoMode ? 'translateX(1.125rem)' : 'translateX(0.125rem)' }}
              />
            </button>
          </div>

          {/* Admin link */}
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

      {/* ── Main content area — offset for fixed sidebar ── */}
      <div className="relative ml-60 min-w-0">
        {/* Demo Mode amber banner */}
        {demoMode && showPlanningHeader && (
          <div
            className="px-4 py-1.5 text-center text-xs font-semibold"
            style={{ backgroundColor: '#FDDD1C', color: '#78350f' }}
          >
            Demo Mode — simulated data is active
          </div>
        )}

        {/* Planning header — royalRed background */}
        {showPlanningHeader && (
          <header
            className="relative flex flex-wrap items-center gap-4 p-4 overflow-hidden"
            style={{ backgroundColor: '#EE2722' }}
          >
            {/* Diagonal stripe watermark */}
            <div
              className="pointer-events-none absolute right-0 top-0 h-full overflow-hidden"
              style={{ width: 220, zIndex: 0 }}
            >
              <svg
                width="220"
                height="100%"
                viewBox="0 0 220 80"
                preserveAspectRatio="none"
                style={{
                  transform: 'rotate(-25deg)',
                  transformOrigin: 'center center',
                  width: '140%',
                  height: '200%',
                  position: 'absolute',
                  top: '-50%',
                  right: '-20%',
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <rect
                    key={i}
                    x={i * 18}
                    y="0"
                    width="9"
                    height="200"
                    fill={i % 2 === 0 ? '#ffffff' : '#FDDD1C'}
                    opacity="0.12"
                  />
                ))}
              </svg>
            </div>

            {/* Header controls */}
            <div className="relative flex flex-wrap items-center gap-4" style={{ zIndex: 1 }}>
              {/* ART selector buttons */}
              <div className="flex items-center gap-2">
                {arts.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedArtId(art.id)}
                    className="rounded-full border px-3 py-1 text-sm transition-colors"
                    style={
                      selectedArtId === art.id
                        ? { backgroundColor: '#ffffff', color: '#EE2722', borderColor: '#ffffff' }
                        : { backgroundColor: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.25)' }
                    }
                  >
                    {art.name}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="h-6 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />

              {/* Density toggle */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white">Card view</span>
                <button
                  onClick={() => setDensity('compact')}
                  className="rounded px-2 py-1 text-sm transition-colors"
                  style={
                    density === 'compact'
                      ? { backgroundColor: '#ffffff', color: '#EE2722' }
                      : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }
                  }
                >
                  Compact
                </button>
                <button
                  onClick={() => setDensity('detailed')}
                  className="rounded px-2 py-1 text-sm transition-colors"
                  style={
                    density === 'detailed'
                      ? { backgroundColor: '#ffffff', color: '#EE2722' }
                      : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }
                  }
                >
                  Detailed
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="p-4">{children}</main>

        {/* Activity Feed Panel — right edge */}
        {showActivityPanel && <ActivityFeedPanel />}
      </div>
    </div>
  );
}
