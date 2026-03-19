'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
type FeedMeta = { teams: MetaTeam[]; arts: MetaEntity[]; initiatives: MetaEntity[] };

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
  Features: '#3b82f6', Dependencies: '#d97706', Imports: '#7c3aed',
  Risks: '#dc2626', Progress: '#16a34a', System: '#6b7280',
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

function isInDateRange(timestamp: string, dateFrom: string, dateTo: string, preset: string): boolean {
  const ts = new Date(timestamp).getTime();
  const now = Date.now();
  if (preset === 'today') {
    const s = new Date(); s.setHours(0, 0, 0, 0); return ts >= s.getTime();
  }
  if (preset === '24h') return ts >= now - 24 * 3600 * 1000;
  if (preset === '48h') return ts >= now - 48 * 3600 * 1000;
  if (preset === 'week') {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const d = s.getDay(); s.setDate(s.getDate() - (d === 0 ? 6 : d - 1));
    return ts >= s.getTime();
  }
  if (dateFrom) { const f = new Date(dateFrom); f.setHours(0,0,0,0); if (ts < f.getTime()) return false; }
  if (dateTo)   { const t = new Date(dateTo);   t.setHours(23,59,59,999); if (ts > t.getTime()) return false; }
  return true;
}

const EMPTY_META: FeedMeta = { teams: [], arts: [], initiatives: [] };
const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '24h',   label: 'Last 24h' },
  { key: '48h',   label: 'Last 48h' },
  { key: 'week',  label: 'This week' },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [events,    setEvents]    = useState<ActivityEvent[]>([]);
  const [cycleName, setCycleName] = useState('');
  const [cycleId,   setCycleId]   = useState<string | null>(null);
  const [meta,      setMeta]      = useState<FeedMeta>(EMPTY_META);
  const [scrolledDown, setScrolledDown] = useState(false);

  // Type filter
  const [hiddenCategories, setHiddenCategories] = useState<Set<EventCategory>>(new Set());
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);

  // Additional filters
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [platFilter, setPlatFilter] = useState('');
  const [artFilter,  setArtFilter]  = useState('');
  const [vsFilter,   setVsFilter]   = useState('');

  const feedRef            = useRef<HTMLDivElement>(null);
  const intervalRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const datesInitializedRef = useRef(false);

  // Close type popover on outside click
  useEffect(() => {
    if (!typeOpen) return;
    const handler = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeOpen]);

  const fetchEvents = useCallback(async (cId?: string) => {
    const params = new URLSearchParams();
    if (cId) params.set('cycleId', cId);
    const res = await fetch(`/api/activity?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      cycleId: string | null;
      cycleName?: string;
      cycleStartDate?: string;
      cycleEndDate?: string;
      events: ActivityEvent[];
      meta?: FeedMeta;
    };
    if (data.cycleId) setCycleId(data.cycleId);
    if (data.cycleName) setCycleName(data.cycleName);
    if (data.meta) setMeta(data.meta);
    if (!datesInitializedRef.current && data.cycleStartDate && data.cycleEndDate) {
      datesInitializedRef.current = true;
      setDateFrom(data.cycleStartDate.slice(0, 10));
      setDateTo(data.cycleEndDate.slice(0, 10));
    }
    setEvents(data.events);
  }, []);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    intervalRef.current = setInterval(() => void fetchEvents(cycleId ?? undefined), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEvents, cycleId]);

  const onScroll = () => { const el = feedRef.current; if (el) setScrolledDown(el.scrollTop > 200); };
  const scrollToTop = () => feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

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

  const availablePlatforms = useMemo(() => {
    const seen = new Set<string>();
    return meta.teams
      .filter((t) => { if (!t.platform || seen.has(t.platform)) return false; seen.add(t.platform); return true; })
      .map((t) => t.platform as string).sort();
  }, [meta.teams]);

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

  const typeLabel = hiddenCategories.size === 0
    ? 'Type ▾'
    : hiddenCategories.size === POPOVER_CATEGORIES.length
      ? 'Type (none) ▾'
      : `Type (${hiddenCategories.size}) ▾`;

  const selectCls = 'rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700';

  return (
    <div className="min-h-screen bg-surfaceSubtle">
      {/* Page header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live Activity Feed</h1>
            {cycleName && <p className="mt-0.5 text-sm text-gray-500">{cycleName}</p>}
          </div>
          <span className="ml-1 animate-pulse rounded-full" style={{ width: 8, height: 8, backgroundColor: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
        </div>
      </header>

      {/* Filter rows */}
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-5xl space-y-2">

          {/* Row 1: Time filters */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setDatePreset(''); }}
              className={selectCls}
              title="From date"
            />
            <span className="text-sm text-gray-400">–</span>
            <input
              type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setDatePreset(''); }}
              className={selectCls}
              title="To date"
            />
            {(dateFrom || dateTo || datePreset) && (
              <button onClick={clearDateFilter} className="text-sm text-gray-400 hover:text-gray-700">×</button>
            )}
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setDatePreset(datePreset === p.key ? '' : p.key); setDateFrom(''); setDateTo(''); }}
                className="rounded px-2 py-1 text-sm transition-colors"
                style={datePreset === p.key
                  ? { backgroundColor: '#EE2722', color: '#ffffff' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Row 2: Context + type filters (ART → Platform → VS → Team → Type) */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={artFilter} onChange={(e) => setArtFilter(e.target.value)} className={selectCls}>
              <option value="">All ARTs</option>
              {meta.arts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="h-5 w-px bg-gray-200" />
            <select value={platFilter} onChange={(e) => setPlatFilter(e.target.value)} className={selectCls}>
              <option value="">All platforms</option>
              {availablePlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="h-5 w-px bg-gray-200" />
            <select value={vsFilter} onChange={(e) => setVsFilter(e.target.value)} className={selectCls}>
              <option value="">All value streams</option>
              {meta.initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <div className="h-5 w-px bg-gray-200" />
            <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className={selectCls}>
              <option value="">All teams</option>
              {meta.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="h-5 w-px bg-gray-200" />
            {/* Type popover */}
            <div ref={typeRef} className="relative">
              <button
                onClick={() => setTypeOpen((o) => !o)}
                className="rounded border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {typeLabel}
              </button>
              {typeOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 rounded border border-gray-200 bg-white shadow-lg" style={{ minWidth: 200 }}>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2">
                    <button onClick={() => setHiddenCategories(new Set())} className="text-xs text-royalRed hover:underline">All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setHiddenCategories(new Set(POPOVER_CATEGORIES))} className="text-xs text-royalRed hover:underline">None</button>
                  </div>
                  {POPOVER_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50">
                      <input type="checkbox" checked={!hiddenCategories.has(cat)} onChange={() => toggleCategory(cat)} style={{ accentColor: CATEGORY_COLOURS[cat] }} />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Result count + clear */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Showing {filteredEvents.length} of {events.length} events
            </span>
            {hasActiveFilter && (
              <button onClick={clearAllFilters} className="text-xs text-royalRed hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl pt-4 pb-6">
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
            style={{ maxHeight: 'calc(100vh - 260px)', scrollbarWidth: 'none' }}
          >
            {filteredEvents.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                No events match the current filters.
              </div>
            ) : (
              filteredEvents.map((event) => {
                const cat = getCategory(event.eventType);
                const color = CATEGORY_COLOURS[cat];
                return (
                  <div
                    key={event.id}
                    className="border-b border-gray-100 px-5 py-3.5 transition-colors hover:bg-gray-50 last:border-b-0"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded px-1.5 py-0.5 text-white"
                        style={{ fontSize: 10, backgroundColor: color, fontWeight: 600, letterSpacing: '0.04em' }}>
                        {cat.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {relativeTime(event.timestamp)} · {new Date(event.timestamp).toLocaleString('en-GB')}
                      </span>
                    </div>
                    <p className="text-sm leading-snug text-gray-800">{event.message}</p>
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
