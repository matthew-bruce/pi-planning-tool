'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type ActivityEvent = {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
};

type FilterCategory =
  | 'All'
  | 'Features'
  | 'Dependencies'
  | 'Imports'
  | 'Risks'
  | 'Progress'
  | 'System';

const FILTER_CATEGORIES: FilterCategory[] = [
  'All', 'Features', 'Dependencies', 'Imports', 'Risks', 'Progress', 'System',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCategory(eventType: string): FilterCategory {
  const t = eventType.toUpperCase();
  if (t.includes('SNAPSHOT') || t.includes('IMPORT')) return 'Imports';
  if (t.includes('DEPENDENCY') || t.includes('DEP_')) return 'Dependencies';
  if (t.includes('FEATURE') || t.includes('SPRINT') || t.includes('COMMITTED') || t.includes('MOVE')) return 'Features';
  if (t.includes('RISK') || t.includes('ATTENTION') || t.includes('CONFLICT')) return 'Risks';
  if (t.includes('STAGE') || t.includes('CONVERGENCE') || t.includes('PROGRESS')) return 'Progress';
  return 'System';
}

const CATEGORY_COLOURS: Record<FilterCategory, string> = {
  All:          '#6b7280',
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
  const [filter, setFilter] = useState<FilterCategory>('All');
  const [scrolledDown, setScrolledDown] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchEvents(cycleId ?? undefined);
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents, cycleId]);

  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 200);
  };

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredEvents = filter === 'All'
    ? events
    : events.filter((e) => getCategory(e.eventType) === filter);

  return (
    <div className="min-h-screen bg-surfaceSubtle">
      {/* Page header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live Activity Feed</h1>
            {cycleName && (
              <p className="text-sm text-gray-500 mt-0.5">{cycleName}</p>
            )}
          </div>
          {/* Live dot */}
          <span
            className="animate-pulse rounded-full ml-1"
            style={{ width: 8, height: 8, backgroundColor: '#16a34a', display: 'inline-block', flexShrink: 0 }}
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="rounded-full px-3 py-1 text-sm font-medium transition-colors"
              style={
                filter === cat
                  ? { backgroundColor: '#EE2722', color: '#ffffff', border: '1px solid #EE2722' }
                  : { backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #e5e7eb' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="relative">
          {scrolledDown && (
            <div className="sticky top-4 flex justify-center z-10 mb-2 pointer-events-none">
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
            className="rounded-lg border border-gray-200 bg-white overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 220px)', scrollbarWidth: 'none' }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>

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
                    className="px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    style={{ borderLeft: `3px solid ${borderColor}` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-white"
                        style={{ fontSize: 10, backgroundColor: borderColor, fontWeight: 600, letterSpacing: '0.04em' }}
                      >
                        {cat.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {relativeTime(event.timestamp)}
                        {' · '}
                        {new Date(event.timestamp).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <p className="text-gray-800 text-sm leading-snug">
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
