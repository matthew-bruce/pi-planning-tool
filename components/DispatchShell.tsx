'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useDispatchStore } from '@/store/useDispatchStore';

const navItems = [
  { href: '/sorting-frame', label: 'Sorting Frame' },
  { href: '/team-planning', label: 'Team Planning Room' },
  { href: '/dependencies', label: 'Dependencies Near You' },
  { href: '/dashboard', label: 'Live Dashboard' },
  { href: '/triage', label: 'Bulk Triage' },
  { href: '/help', label: 'Help' },
  { href: '/admin', label: 'Admin Control Centre' },
];

export function DispatchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { arts, selectedArtId, setSelectedArtId, demoMode, setDemoMode, density, setDensity, hydrateSeed, runSimulationTick } = useDispatchStore();

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
      <aside className="border-r border-gray-200 bg-gray-50 p-4">
        <h1 className="text-2xl font-bold text-royalRed mb-6">Dispatch</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`block rounded px-3 py-2 text-sm ${pathname === item.href ? 'bg-royalRed text-white' : 'hover:bg-gray-200'}`}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div>
        <header className="border-b border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {arts.map((art) => (
              <button
                key={art.id}
                onClick={() => setSelectedArtId(art.id)}
                className={`px-3 py-1 rounded-full text-sm border ${selectedArtId === art.id ? 'bg-royalRed text-white border-royalRed' : 'border-gray-300'}`}
              >
                {art.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span>Demo Mode</span>
            <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span>Density</span>
            <button onClick={() => setDensity('compact')} className={`px-2 py-1 rounded ${density === 'compact' ? 'bg-royalRed text-white' : 'bg-gray-100'}`}>Compact</button>
            <button onClick={() => setDensity('detailed')} className={`px-2 py-1 rounded ${density === 'detailed' ? 'bg-royalRed text-white' : 'bg-gray-100'}`}>Detailed</button>
          </div>
        </header>

        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
