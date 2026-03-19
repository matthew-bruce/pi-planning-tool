'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Filter,
  FlaskConical,
  GitBranch,
  HelpCircle,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDispatchStore } from '@/store/useDispatchStore';
import { ActivityFeedPanel } from '@/components/ActivityFeedPanel';

const SIDEBAR_EXPANDED = 180;
const SIDEBAR_COLLAPSED = 52;

type NavItem = { href: string; label: string; icon: LucideIcon };

const planningNavItems: NavItem[] = [
  { href: '/sorting-frame',  label: 'Sorting Frame',       icon: LayoutGrid  },
  { href: '/team-planning',  label: 'Team Planning Room',  icon: Users       },
  { href: '/dependencies',   label: 'Dependencies Near You', icon: GitBranch },
  { href: '/dashboard',      label: 'Live Dashboard',      icon: BarChart2   },
  { href: '/activity',       label: 'Activity',            icon: Activity    },
  { href: '/triage',         label: 'Bulk Triage',         icon: Filter      },
  { href: '/help',           label: 'Help',                icon: HelpCircle  },
];

export function DispatchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isHelp  = pathname === '/help'  || pathname.startsWith('/help/');
  const showPlanningHeader = !isAdmin && !isHelp;
  const showActivityPanel  = !isAdmin && !isHelp;

  // Initialise to expanded so server render and initial client hydration agree.
  // The useEffect below reads localStorage + screen width after hydration.
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

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

  // Restore preference from localStorage, enforce collapsed on mobile.
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setCollapsed(
      mobile ? true : localStorage.getItem('dispatch_nav_collapsed') === 'true'
    );
  }, []);

  // Keep mobile state in sync on resize.
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('dispatch_nav_collapsed', String(next));
  };

  useEffect(() => {
    hydrateSeed();
  }, [hydrateSeed]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = (8 + Math.random() * 7) * 1000;
      timeoutId = setTimeout(() => { runSimulationTick(); schedule(); }, delay);
    };
    schedule();
    return () => clearTimeout(timeoutId);
  }, [runSimulationTick]);

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <div className="min-h-screen">

      {/* ── Fixed Sidebar ── */}
      <aside
        className="fixed left-0 top-0 z-20 flex h-screen flex-col overflow-hidden border-r border-gray-200 bg-white"
        style={{
          width: sidebarW,
          padding: collapsed ? '1rem 0.5rem' : '1rem',
          transition: 'width 200ms ease, padding 200ms ease',
        }}
      >
        {/* Brand area */}
        <div className="shrink-0">
          {/* Top row: logo (expanded only) + collapse toggle (desktop only) */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/Royal_Mail_logo_2024.svg"
                alt="Royal Mail"
                style={{ height: 32 }}
              />
            )}
            {!isMobile && (
              <button
                onClick={toggleCollapsed}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex h-7 w-7 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>

          {/* Wordmark + subtitle — hidden when collapsed */}
          {!collapsed && (
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-royalRed">Dispatch</h1>
              <p className="mt-0.5 text-xs text-gray-500">PI Planning orchestration</p>
            </div>
          )}
        </div>

        {/* Royal Mail stripe accent */}
        <div
          className="my-3 h-1 w-full shrink-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, #EE2722, #EE2722, #FDDD1C, #f97316, #fca5a5)',
          }}
        />

        {/* Planning section label — expanded only */}
        {!collapsed && (
          <div className="mb-2 shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Planning
          </div>
        )}

        {/* Planning nav — scrollable if needed */}
        <nav className="flex-1 overflow-y-auto space-y-0.5">
          {planningNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  'flex items-center rounded py-2 text-sm transition-colors',
                  collapsed ? 'justify-center px-0' : 'gap-2 px-3',
                  isActive
                    ? 'bg-royalRed text-white'
                    : 'text-gray-700 hover:bg-gray-100',
                ].join(' ')}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Config items — pinned to bottom */}
        <div className="mt-auto shrink-0 pt-3">
          {!collapsed && (
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Configuration
            </div>
          )}

          {/* Demo Mode */}
          {collapsed ? (
            <button
              onClick={() => setDemoMode(!demoMode)}
              title={demoMode ? 'Demo Mode — on' : 'Demo Mode — off'}
              className="mb-1 flex w-full items-center justify-center rounded py-2 transition-colors hover:bg-gray-100"
              style={{ color: demoMode ? '#d97706' : '#9ca3af' }}
            >
              <FlaskConical size={16} className="shrink-0" />
            </button>
          ) : (
            <div className="mb-2 flex items-center justify-between rounded border border-gray-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <FlaskConical size={16} className="shrink-0 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-700">Demo Mode</div>
                  {demoMode && <div className="text-xs text-amber-700">Simulated data</div>}
                </div>
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
          )}

          {/* Admin */}
          {collapsed ? (
            <Link
              href="/admin"
              title="Admin"
              className={[
                'flex w-full items-center justify-center rounded py-2 transition-colors hover:bg-gray-100',
                isAdmin ? 'text-royalRed' : 'text-gray-700',
              ].join(' ')}
            >
              <Settings size={16} className="shrink-0" />
            </Link>
          ) : (
            <Link
              href="/admin"
              className={[
                'flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors',
                isAdmin
                  ? 'border-royalRed bg-white text-royalRed'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100',
              ].join(' ')}
            >
              <Settings size={16} className="shrink-0" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main content area — offset for fixed sidebar ── */}
      <div
        className="relative min-w-0"
        style={{
          marginLeft: sidebarW,
          transition: 'margin-left 200ms ease',
        }}
      >
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
            className="relative flex flex-wrap items-center gap-4 overflow-hidden p-4"
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
              {/* ART selector */}
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

              <div className="h-6 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />

              {/* Density toggle */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white">Card view</span>
                {(['compact', 'detailed'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className="rounded px-2 py-1 text-sm capitalize transition-colors"
                    style={
                      density === d
                        ? { backgroundColor: '#ffffff', color: '#EE2722' }
                        : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </header>
        )}

        <main className="p-4">{children}</main>

        {showActivityPanel && <ActivityFeedPanel />}
      </div>
    </div>
  );
}
