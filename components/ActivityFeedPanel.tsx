'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

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

// ── Category helpers ─────────────────────────────────────────────────────────

function getCategory(eventType: string): FilterCategory {
  const t = eventType.toUpperCase();
  if (t.includes('SNAPSHOT') || t.includes('IMPORT')) return 'Imports';
  if (t.includes('DEPENDENCY') || t.includes('DEP_')) return 'Dependencies';
  if (t.includes('FEATURE') || t.includes('SPRINT') || t.includes('COMMITTED') || t.includes('MOVE')) return 'Features';
  if (t.includes('RISK') || t.includes('ATTENTION') || t.includes('CONFLICT')) return 'Risks';
  if (t.includes('STAGE') || t.includes('CONVERGENCE') || t.includes('PROGRESS')) return 'Progress';
  if (t.includes('CYCLE') || t.includes('TEAM_ADDED') || t.includes('SYSTEM')) return 'System';
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

// ── Component ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dispatch_feed_open';

export function ActivityFeedPanel() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleName, setCycleName] = useState<string>('');
  const [filter, setFilter] = useState<FilterCategory>('All');
  const [hasUnread, setHasUnread] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const feedRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch events
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

    const incoming = data.events;
    if (!incoming.length) return;

    // Detect new events
    const latestKnown = latestTimestampRef.current;
    const newEvents = latestKnown
      ? incoming.filter((e) => e.timestamp > latestKnown)
      : [];

    latestTimestampRef.current = incoming[0]?.timestamp ?? null;

    setEvents(incoming);

    if (newEvents.length > 0 && !isOpen) {
      setHasUnread(true);
    }
    if (newEvents.length > 0 && scrolledDown) {
      setNewCount((prev) => prev + newEvents.length);
    }
  }, [isOpen, scrolledDown]);

  // Initial fetch
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchEvents(cycleId ?? undefined);
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEvents, cycleId]);

  // Persist open state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
    if (isOpen) {
      setHasUnread(false);
      setNewCount(0);
    }
  }, [isOpen]);

  // Scroll tracking
  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 200);
  };

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setNewCount(0);
  };

  const filteredEvents = filter === 'All'
    ? events
    : events.filter((e) => getCategory(e.eventType) === filter);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Collapsed tab — always visible on right edge */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center cursor-pointer"
        style={{
          width: 28,
          height: 96,
          backgroundColor: '#ffffff',
          borderLeft: '0.5px solid #e5e7eb',
          borderTop: '0.5px solid #e5e7eb',
          borderBottom: '0.5px solid #e5e7eb',
          borderRadius: '4px 0 0 4px',
          boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
        }}
        onClick={() => setIsOpen((o) => !o)}
        title={isOpen ? 'Collapse activity feed' : 'Open activity feed'}
      >
        {/* Unread dot */}
        {hasUnread && (
          <div
            className="absolute"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#EE2722',
              top: 8,
              right: 8,
            }}
          />
        )}
        <span
          className="text-gray-500 select-none"
          style={{
            fontSize: 11,
            fontWeight: 500,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            letterSpacing: '0.05em',
          }}
        >
          Activity
        </span>
      </div>

      {/* Expanded panel */}
      <div
        className="fixed top-0 right-0 h-full z-30 flex flex-col bg-white"
        style={{
          width: isOpen ? 300 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          boxShadow: isOpen ? '-4px 0 16px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {isOpen && (
          <div className="flex h-full flex-col" style={{ width: 300 }}>
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">Activity Feed</span>
                {/* Live green dot */}
                <span
                  className="animate-pulse rounded-full"
                  style={{ width: 7, height: 7, backgroundColor: '#16a34a', display: 'inline-block' }}
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-400 hover:text-gray-700 px-1"
                title="Collapse"
              >
                →
              </button>
            </div>

            {cycleName && (
              <div className="border-b border-gray-100 px-3 py-1.5 text-xs text-gray-500 truncate">
                {cycleName}
              </div>
            )}

            {/* Filter chips */}
            <div
              className="flex gap-1.5 border-b border-gray-100 px-3 py-2 overflow-x-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
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
            <div className="relative flex-1 overflow-hidden">
              {/* New events badge */}
              {newCount > 0 && (
                <button
                  onClick={scrollToTop}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full px-3 py-1 text-xs font-medium shadow"
                  style={{ backgroundColor: '#EE2722', color: '#ffffff' }}
                >
                  ↑ {newCount} new
                </button>
              )}

              <div
                ref={feedRef}
                onScroll={onScroll}
                className="h-full overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                <style>{`.activity-feed-inner::-webkit-scrollbar { display: none; }`}</style>

                {/* Scroll to top pill */}
                {scrolledDown && (
                  <div className="sticky top-2 flex justify-center z-10 pointer-events-none">
                    <button
                      className="pointer-events-auto rounded-full px-3 py-1 text-xs font-medium shadow"
                      style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#374151' }}
                      onClick={scrollToTop}
                    >
                      ↑ Latest
                    </button>
                  </div>
                )}

                {filteredEvents.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-gray-400">No events yet.</p>
                ) : (
                  filteredEvents.map((event) => {
                    const cat = getCategory(event.eventType);
                    const borderColor = CATEGORY_COLOURS[cat];
                    return (
                      <div
                        key={event.id}
                        className="px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        style={{ borderLeft: `3px solid ${borderColor}` }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className="rounded px-1.5 py-0.5 text-white"
                            style={{ fontSize: 9, backgroundColor: borderColor, fontWeight: 600, letterSpacing: '0.03em' }}
                          >
                            {cat.toUpperCase()}
                          </span>
                          <span className="text-gray-400" style={{ fontSize: 10 }}>
                            {relativeTime(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-snug" style={{ fontSize: 11 }}>
                          {event.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-3 py-2">
              <Link
                href="/activity"
                className="text-xs hover:underline font-medium"
                style={{ color: '#EE2722', fontSize: 12 }}
              >
                Open full screen →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
