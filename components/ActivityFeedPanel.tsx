'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityEvent = {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
  teamId: string | null;
  artId: string | null;
  initiativeId: string | null;
};

type MetaEntity = { id: string; name: string };
type MetaTeam = MetaEntity & { platform: string | null };

type FeedMeta = {
  teams: MetaTeam[];
  arts: MetaEntity[];
  initiatives: MetaEntity[];
};

type EventCategory = 'Features' | 'Dependencies' | 'Imports' | 'Risks' | 'Progress' | 'System';

const POPOVER_CATEGORIES: EventCategory[] = [
  'Features', 'Dependencies', 'Imports', 'Risks', 'Progress', 'System',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function isInDateRange(
  timestamp: string,
  dateFrom: string,
  dateTo: string,
  preset: string,
): boolean {
  const ts = new Date(timestamp).getTime();
  const now = Date.now();
  if (preset === 'today') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  if (preset === '24h') return ts >= now - 24 * 3600 * 1000;
  if (preset === '48h') return ts >= now - 48 * 3600 * 1000;
  if (preset === 'week') {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = start.getDay(); // 0=Sun
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); // back to Monday
    return ts >= start.getTime();
  }
  if (dateFrom) {
    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
    if (ts < from.getTime()) return false;
  }
  if (dateTo) {
    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
    if (ts > to.getTime()) return false;
  }
  return true;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dispatch_feed_open';
const WIDTH_KEY   = 'dispatch_feed_width';
const CLAMP_WIDTH = 'clamp(280px, 22vw, 420px)';
const EMPTY_META: FeedMeta = { teams: [], arts: [], initiatives: [] };

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '24h',   label: '24h' },
  { key: '48h',   label: '48h' },
  { key: 'week',  label: 'This week' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFeedPanel() {
  // ── Open/close ──────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  // ── Event data ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [cycleName, setCycleName] = useState<string>('');
  const [meta, setMeta] = useState<FeedMeta>(EMPTY_META);
  const [hasUnread, setHasUnread] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // ── Type filter (popover) ───────────────────────────────────────────────────
  const [hiddenCategories, setHiddenCategories] = useState<Set<EventCategory>>(new Set());
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  // ── Additional filters ──────────────────────────────────────────────────────
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [datePreset,  setDatePreset]  = useState('');
  const [teamFilter,  setTeamFilter]  = useState('');
  const [platFilter,  setPlatFilter]  = useState('');
  const [artFilter,   setArtFilter]   = useState('');
  const [vsFilter,    setVsFilter]    = useState('');

  // ── Panel resize ────────────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(320);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const panelWidthRef = useRef(320);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const feedRef = useRef<HTMLDivElement>(null);
  const latestTimestampRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init: pointer + stored width ────────────────────────────────────────────
  useEffect(() => {
    setIsFinePointer(window.matchMedia('(pointer: fine)').matches);
    const stored = localStorage.getItem(WIDTH_KEY);
    if (stored) {
      const w = parseInt(stored, 10);
      if (w >= 280 && w <= 600) { setPanelWidth(w); panelWidthRef.current = w; }
    }
  }, []);

  // ── Close type popover on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!typeOpen) return;
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeOpen]);

  // ── Fetch events ────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (cId?: string) => {
    const params = new URLSearchParams();
    if (cId) params.set('cycleId', cId);
    const res = await fetch(`/api/activity?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      cycleId: string | null;
      cycleName?: string;
      events: ActivityEvent[];
      meta?: FeedMeta;
    };
    if (data.cycleId) setCycleId(data.cycleId);
    if (data.cycleName) setCycleName(data.cycleName);
    if (data.meta) setMeta(data.meta);
    const incoming = data.events;
    if (!incoming.length) return;
    const latestKnown = latestTimestampRef.current;
    const newEvents = latestKnown ? incoming.filter((e) => e.timestamp > latestKnown) : [];
    latestTimestampRef.current = incoming[0]?.timestamp ?? null;
    setEvents(incoming);
    if (newEvents.length > 0 && !isOpen) setHasUnread(true);
    if (newEvents.length > 0 && scrolledDown) setNewCount((p) => p + newEvents.length);
  }, [isOpen, scrolledDown]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  useEffect(() => {
    intervalRef.current = setInterval(() => void fetchEvents(cycleId ?? undefined), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEvents, cycleId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isOpen));
    if (isOpen) { setHasUnread(false); setNewCount(0); }
  }, [isOpen]);

  // ── Drag resize ─────────────────────────────────────────────────────────────
  const onDragHandleMouseDown = (e: React.MouseEvent) => {
    if (!isFinePointer) return;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (ev: MouseEvent) => {
      const w = Math.min(600, Math.max(280, window.innerWidth - ev.clientX));
      setPanelWidth(w);
      panelWidthRef.current = w;
    };
    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem(WIDTH_KEY, String(panelWidthRef.current));
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Scroll ───────────────────────────────────────────────────────────────────
  const onScroll = () => {
    const el = feedRef.current;
    if (!el) return;
    setScrolledDown(el.scrollTop > 200);
  };
  const scrollToTop = () => { feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); setNewCount(0); };

  // ── Filter helpers ───────────────────────────────────────────────────────────
  const toggleCategory = (cat: EventCategory) => {
    setHiddenCategories((prev) => { const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; });
  };

  const clearDateFilter = () => { setDateFrom(''); setDateTo(''); setDatePreset(''); };

  const hasActiveFilter = hiddenCategories.size > 0 || dateFrom || dateTo || datePreset
    || teamFilter || platFilter || artFilter || vsFilter;

  const clearAllFilters = () => {
    setHiddenCategories(new Set());
    setDateFrom(''); setDateTo(''); setDatePreset('');
    setTeamFilter(''); setPlatFilter(''); setArtFilter(''); setVsFilter('');
  };

  // ── Derived filter options ────────────────────────────────────────────────
  const availablePlatforms = useMemo(() => {
    const seen = new Set<string>();
    return meta.teams
      .filter((t) => { if (!t.platform || seen.has(t.platform)) return false; seen.add(t.platform); return true; })
      .map((t) => t.platform as string)
      .sort();
  }, [meta.teams]);

  // ── Filtered events ───────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (hiddenCategories.has(getCategory(event.eventType))) return false;
      if (datePreset || dateFrom || dateTo) {
        if (!isInDateRange(event.timestamp, dateFrom, dateTo, datePreset)) return false;
      }
      if (teamFilter && event.teamId !== teamFilter) return false;
      if (artFilter  && event.artId   !== artFilter)  return false;
      if (vsFilter   && event.initiativeId !== vsFilter) return false;
      if (platFilter) {
        const team = meta.teams.find((t) => t.id === event.teamId);
        if (!team || team.platform !== platFilter) return false;
      }
      return true;
    });
  }, [events, hiddenCategories, datePreset, dateFrom, dateTo, teamFilter, artFilter, vsFilter, platFilter, meta.teams]);

  // ── Type button label ─────────────────────────────────────────────────────
  const typeLabel = hiddenCategories.size === 0
    ? 'Type ▾'
    : hiddenCategories.size === POPOVER_CATEGORIES.length
      ? 'Type (none) ▾'
      : `Type (${hiddenCategories.size}) ▾`;

  // ── Panel width ────────────────────────────────────────────────────────────
  const openWidth = isFinePointer ? `${panelWidth}px` : CLAMP_WIDTH;

  // ── Select className helper ────────────────────────────────────────────────
  const selectCls = 'w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Collapsed tab */}
      <div
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 flex cursor-pointer flex-col items-center justify-center"
        style={{
          width: 28, height: 96,
          backgroundColor: '#ffffff',
          borderLeft: '0.5px solid #e5e7eb', borderTop: '0.5px solid #e5e7eb', borderBottom: '0.5px solid #e5e7eb',
          borderRadius: '4px 0 0 4px', boxShadow: '-2px 0 4px rgba(0,0,0,0.06)',
        }}
        onClick={() => setIsOpen((o) => !o)}
        title={isOpen ? 'Collapse activity feed' : 'Open activity feed'}
      >
        {hasUnread && (
          <div className="absolute" style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#EE2722', top: 8, right: 8 }} />
        )}
        <span className="select-none text-gray-500"
          style={{ fontSize: 11, fontWeight: 500, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}
        >
          Activity
        </span>
      </div>

      {/* Expanded panel */}
      <div
        className="fixed right-0 top-0 z-30 flex h-full flex-col bg-white"
        style={{
          width: isOpen ? openWidth : 0,
          minWidth: isOpen ? undefined : 0,
          overflow: 'hidden',
          transition: isFinePointer ? undefined : 'width 0.2s ease',
          boxShadow: isOpen ? '-4px 0 16px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {isOpen && (
          <div className="relative flex h-full w-full flex-col">
            {/* Drag handle — left edge, fine pointer only */}
            {isFinePointer && (
              <div
                onMouseDown={onDragHandleMouseDown}
                className="absolute left-0 top-0 z-10 h-full"
                style={{ width: 4, cursor: 'col-resize', backgroundColor: 'transparent' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e5e7eb'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              />
            )}

            {/* Panel header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2.5 pl-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">Activity Feed</span>
                <span className="animate-pulse rounded-full" style={{ width: 7, height: 7, backgroundColor: '#16a34a', display: 'inline-block' }} />
              </div>
              <button onClick={() => setIsOpen(false)} className="px-1 text-sm text-gray-400 hover:text-gray-700" title="Collapse">→</button>
            </div>

            {cycleName && (
              <div className="shrink-0 truncate border-b border-gray-100 px-3 py-1.5 text-xs text-gray-500">{cycleName}</div>
            )}

            {/* ── Filter controls ──────────────────────────────────────────── */}
            <div className="shrink-0 border-b border-gray-100 px-3 py-2 space-y-2">

              {/* Row 1: Type button + Clear all */}
              <div className="flex items-center justify-between gap-2">
                {/* Type popover */}
                <div ref={typeRef} className="relative">
                  <button
                    onClick={() => setTypeOpen((o) => !o)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {typeLabel}
                  </button>
                  {typeOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 rounded border border-gray-200 bg-white shadow-lg" style={{ minWidth: 180 }}>
                      {/* All / None row */}
                      <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-1.5">
                        <button onClick={() => setHiddenCategories(new Set())} className="text-xs text-royalRed hover:underline">All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setHiddenCategories(new Set(POPOVER_CATEGORIES))} className="text-xs text-royalRed hover:underline">None</button>
                      </div>
                      {POPOVER_CATEGORIES.map((cat) => (
                        <label key={cat} className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50">
                          <input type="checkbox" checked={!hiddenCategories.has(cat)} onChange={() => toggleCategory(cat)} style={{ accentColor: CATEGORY_COLOURS[cat] }} />
                          <span className="text-sm text-gray-700">{cat}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {hasActiveFilter && (
                  <button onClick={clearAllFilters} className="text-xs text-royalRed hover:underline">Clear all</button>
                )}
              </div>

              {/* Row 2: Date range */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <input
                    type="date" value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setDatePreset(''); }}
                    className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700"
                    title="From date"
                  />
                  <span className="shrink-0 text-xs text-gray-400">–</span>
                  <input
                    type="date" value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setDatePreset(''); }}
                    className="w-full rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-700"
                    title="To date"
                  />
                  {(dateFrom || dateTo || datePreset) && (
                    <button onClick={clearDateFilter} className="shrink-0 text-xs text-gray-400 hover:text-gray-700">×</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {DATE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => { setDatePreset(datePreset === p.key ? '' : p.key); setDateFrom(''); setDateTo(''); }}
                      className="rounded px-1.5 py-0.5 text-xs transition-colors"
                      style={datePreset === p.key
                        ? { backgroundColor: '#EE2722', color: '#ffffff' }
                        : { backgroundColor: '#f3f4f6', color: '#4b5563' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3-4: Entity dropdowns */}
              <div className="grid grid-cols-2 gap-1.5">
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={selectCls}>
                  <option value="">All teams</option>
                  {meta.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={platFilter} onChange={(e) => setPlatFilter(e.target.value)} className={selectCls}>
                  <option value="">All platforms</option>
                  {availablePlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={artFilter} onChange={(e) => setArtFilter(e.target.value)} className={selectCls}>
                  <option value="">All ARTs</option>
                  {meta.arts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={vsFilter} onChange={(e) => setVsFilter(e.target.value)} className={selectCls}>
                  <option value="">All VS</option>
                  {meta.initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>

              {/* Result count */}
              <div className="text-xs text-gray-400">
                Showing {filteredEvents.length} of {events.length} events
              </div>
            </div>

            {/* ── Feed ─────────────────────────────────────────────────────── */}
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
              <div ref={feedRef} onScroll={onScroll} className="h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
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
                  <p className="px-3 py-4 text-xs text-gray-400">No events match the current filters.</p>
                ) : (
                  filteredEvents.map((event) => {
                    const cat = getCategory(event.eventType);
                    const color = CATEGORY_COLOURS[cat];
                    return (
                      <div
                        key={event.id}
                        className="px-3 py-2.5 hover:bg-gray-50 transition-colors"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <div className="mb-0.5 flex items-center justify-between gap-1">
                          <span className="rounded px-1.5 py-0.5 text-white"
                            style={{ fontSize: 9, backgroundColor: color, fontWeight: 600, letterSpacing: '0.03em' }}>
                            {cat.toUpperCase()}
                          </span>
                          <span className="text-gray-400" style={{ fontSize: 10 }}>{relativeTime(event.timestamp)}</span>
                        </div>
                        <p className="leading-snug text-gray-700" style={{ fontSize: 11 }}>{event.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-gray-100 px-3 py-2">
              <Link href="/activity" className="text-xs font-medium hover:underline" style={{ color: '#EE2722', fontSize: 12 }}>
                Open full screen →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
