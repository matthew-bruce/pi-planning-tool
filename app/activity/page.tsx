'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityEvent = {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
};

type EventCategory = 'Features' | 'Dependencies' | 'Imports' | 'Risks' | 'Progress' | 'System';

const POPOVER_CATEGORIES: EventCategory[] = [
  'Features', 'Dependencies', 'Imports', 'Risks', 'Progress', 'System',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(eventType: string): EventCategory {
  const t = eventType.toUpperCase();
  if (t.includes('SNAPSHOT') || t.includes('IMPORT')) return 'Imports';
  if (t.includes('DEPENDENCY') || t.includes('DEP_')) return 'Dependencies';
  if (t.includes('FEATURE') || t.includes('SPRINT') || t.includes('COMMITTED') || t.includes('MOVE')) return 'Features';
  if (t.includes('RISK') || t.includes('ATTENTION') || t.includes('CONFLICT')) return 'Risks';
  if (t.includes('STAGE') || t.includes('CONVERGENCE') || t.includes('PROGRESS')) return 'Progress';
  return 'System';
}

const CATEGORY_COLOURS: Record<EventCategory, string> = {
  Features:     '#3b82f6',
  Dependencies: '#d97706',
  Imports:      '#7c3aed',
  Risks:        '#dc2626',
  Progress:     '#16a34a',
  System:       '#6b7280',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cycleName, setCycleName] = useState<string>('');
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<Set<EventCategory>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  const fetchEvents = useCallback(async (cId?: string) => {
    const params = new URLSearchParams();
    if (cId) params.set('cycleId', cId);

    const res = await fetch(`/api/activity?${params.toString()}`);
    if (!res.ok) return;

    const data = (await res.json()) as {
      cycleId: string | null;
      cycleName?: string;
      events: ActivityEvent[];
    };

    if (data.cycleId) setCycleId(data.cycleId);
    if (data.cycleName) setCycleName(data.cycleName);
    setEvents(data.events);
  }, []);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchEvents(cycleId ?? undefined);
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEvents, cycleId]);

  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 200);
  };

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCategory = (cat: EventCategory) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const hiddenCount = hiddenCategories.size;
  const filterLabel = hiddenCount === 0 ? 'Filter ▾' : `Filter (${hiddenCount} hidden) ▾`;
  const filteredEvents = events.filter((e) => !hiddenCategories.has(getCategory(e.eventType)));

  return (
    <div className="min-h-screen bg-surfaceSubtle">
      {/* Page header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Live Activity Feed</h1>
              {cycleName && (
                <p className="mt-0.5 text-sm text-gray-500">{cycleName}</p>
              )}
            </div>
            <span
              className="ml-1 animate-pulse rounded-full"
              style={{ width: 8, height: 8, backgroundColor: '#16a34a', display: 'inline-block', flexShrink: 0 }}
            />
          </div>

          {/* Filter button + popover */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {filterLabel}
            </button>

            {filterOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 rounded border border-gray-200 bg-white shadow-lg"
                style={{ minWidth: 200 }}
              >
                {POPOVER_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenCategories.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      style={{ accentColor: CATEGORY_COLOURS[cat] }}
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-6">
        {/* Feed */}
        <div className="relative">
          {scrolledDown && (
            <div className="pointer-events-none sticky top-4 z-10 mb-2 flex justify-center">
              <button
                className="pointer-events-auto rounded-full px-4 py-1.5 text-sm font-medium shadow"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#374151' }}
                onClick={scrollToTop}
              >
                ↑ Latest
              </button>
            </div>
          )}

          <div
            ref={feedRef}
            onScroll={onScroll}
            className="overflow-y-auto rounded-lg border border-gray-200 bg-white"
            style={{ maxHeight: 'calc(100vh - 200px)', scrollbarWidth: 'none' }}
          >
            {filteredEvents.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                No activity events yet for this Program Increment.
              </div>
            ) : (
              filteredEvents.map((event) => {
                const cat = getCategory(event.eventType);
                const borderColor = CATEGORY_COLOURS[cat];
                return (
                  <div
                    key={event.id}
                    className="border-b border-gray-100 px-5 py-3.5 transition-colors hover:bg-gray-50 last:border-b-0"
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-white"
                        style={{ fontSize: 10, backgroundColor: borderColor, fontWeight: 600, letterSpacing: '0.04em' }}
                      >
                        {cat.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {relativeTime(event.timestamp)}
                        {' · '}
                        {new Date(event.timestamp).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-gray-800">
                      {event.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
