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

type EventCategory = 'Features' | 'Dependencies' | 'Imports' | 'Risks' | 'Progress' | 'System';

const POPOVER_CATEGORIES: EventCategory[] = [
  'Features', 'Dependencies', 'Imports', 'Risks', 'Progress', 'System',
];

// ── Category helpers ─────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dispatch_feed_open';
const PANEL_WIDTH = 'clamp(280px, 22vw, 420px)';

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFeedPanel() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleName, setCycleName] = useState<string>('');
  const [hiddenCategories, setHiddenCategories] = useState<Set<EventCategory>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const feedRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(null);
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

    const latestKnown = latestTimestampRef.current;
    const newEvents = latestKnown
      ? incoming.filter((e) => e.timestamp > latestKnown)
      : [];

    latestTimestampRef.current = incoming[0]?.timestamp ?? null;
    setEvents(incoming);

    if (newEvents.length > 0 && !isOpen) setHasUnread(true);
    if (newEvents.length > 0 && scrolledDown) setNewCount((prev) => prev + newEvents.length);
  }, [isOpen, scrolledDown]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void fetchEvents(cycleId ?? undefined);
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEvents, cycleId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
    if (isOpen) { setHasUnread(false); setNewCount(0); }
  }, [isOpen]);

  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 200);
  };

  const scrollToTop = () => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setNewCount(0);
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

  // ── Render ──────────────────────────────────────────────────────────────────

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
        {hasUnread && (
          <div
            className="absolute"
            style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#EE2722', top: 8, right: 8 }}
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
          width: isOpen ? PANEL_WIDTH : 0,
          minWidth: isOpen ? undefined : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          boxShadow: isOpen ? '-4px 0 16px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {isOpen && (
          <div className="flex h-full w-full flex-col">
            {/* Panel header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">Activity Feed</span>
                <span
                  className="animate-pulse rounded-full"
                  style={{ width: 7, height: 7, backgroundColor: '#16a34a', display: 'inline-block' }}
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-1 text-sm text-gray-400 hover:text-gray-700"
                title="Collapse"
              >
                →
              </button>
            </div>

            {cycleName && (
              <div className="shrink-0 border-b border-gray-100 px-3 py-1.5 text-xs text-gray-500 truncate">
                {cycleName}
              </div>
            )}

            {/* Filter button + popover */}
            <div
              ref={filterRef}
              className="relative shrink-0 border-b border-gray-100 px-3 py-2"
            >
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {filterLabel}
              </button>

              {filterOpen && (
                <div
                  className="absolute left-3 top-full z-50 mt-1 rounded border border-gray-200 bg-white shadow-lg"
                  style={{ minWidth: 190 }}
                >
                  {POPOVER_CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50"
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

            {/* Feed */}
            <div className="relative flex-1 overflow-hidden">
              {newCount > 0 && (
                <button
                  onClick={scrollToTop}
                  className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium shadow"
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
                {scrolledDown && (
                  <div className="pointer-events-none sticky top-2 z-10 flex justify-center">
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
                        <div className="mb-0.5 flex items-center justify-between gap-1">
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
                        <p className="leading-snug text-gray-700" style={{ fontSize: 11 }}>
                          {event.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-2">
              <Link
                href="/activity"
                className="text-xs font-medium hover:underline"
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
