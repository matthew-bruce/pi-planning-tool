'use client';

import { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setProgramIncrementStage } from '@/app/admin/actions';
import type { PlanningStageId } from '@/lib/planning/stages';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '@/lib/types/dashboard';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConceptualTile } from '@/components/ui/ConceptualTile';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PLANNING_STAGES } from '@/lib/planning/stages';
import {
  convergenceThresholds,
  getConvergenceStatus,
  getConvergenceLabel,
  getParkingLotStatus,
  type ThresholdStatus,
} from '@/data/dashboardThresholds';
import { getContextualReading } from '@/data/dashboardActions';

type Props = { initialData: DashboardData };

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLOUR: Record<ThresholdStatus, { bg: string; text: string; border: string }> = {
  success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-success' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-warning' },
  danger:  { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-danger' },
};

function statusPillClasses(status: ThresholdStatus): string {
  const s = STATUS_COLOUR[status];
  return `${s.bg} ${s.text} rounded-full px-2 py-0.5 text-xs font-medium`;
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function getFreshnessCard(
  lastImport: string | null,
  stage: number,
): { status: ThresholdStatus; isNeutral: boolean; value: string; sub: string; reading: string } {
  const isPostEvent = stage === 6;

  if (!lastImport) {
    if (isPostEvent) {
      return {
        status: 'success',
        isNeutral: true,
        value: 'No imports',
        sub: 'Event complete — import history only',
        reading: '',
      };
    }
    return {
      status: 'danger',
      isNeutral: false,
      value: 'No imports',
      sub: 'Last successful import',
      reading: getContextualReading('freshness', 'danger'),
    };
  }

  const mins = (Date.now() - new Date(lastImport).getTime()) / 60_000;
  const roundedMins = Math.round(mins);
  const valueStr =
    roundedMins < 1
      ? 'Just now'
      : roundedMins < 60
        ? `${roundedMins}m ago`
        : `${Math.round(roundedMins / 60)}h ago`;

  if (isPostEvent) {
    const dateStr = new Date(lastImport).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return {
      status: 'success',
      isNeutral: true,
      value: valueStr,
      sub: `Last import: ${dateStr}`,
      reading: 'Event complete — import history only.',
    };
  }

  const status: ThresholdStatus = mins <= 15 ? 'success' : mins <= 60 ? 'warning' : 'danger';
  return {
    status,
    isNeutral: false,
    value: valueStr,
    sub: 'Last successful import',
    reading: getContextualReading('freshness', status),
  };
}

function getSprintMedian(loads: number[]): number {
  if (loads.length === 0) return 0;
  const sorted = [...loads].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// WCAG 1.4.1 — shape + colour for dependency status
const DEP_STATUS_META: Record<string, { shape: string; label: string; colour: string }> = {
  blocked:  { shape: '■', label: 'Blocked',  colour: 'text-danger' },
  at_risk:  { shape: '▲', label: 'At risk',  colour: 'text-warningText' },
  open:     { shape: '●', label: 'Open',     colour: 'text-textMuted' },
  resolved: { shape: '✓', label: 'Resolved', colour: 'text-success' },
  removed:  { shape: '—', label: 'Removed',  colour: 'text-neutral' },
};

// ── Component ──────────────────────────────────────────────────────────────

export function LiveDashboard({ initialData }: Props) {
  const router = useRouter();
  const data = initialData;
  const rawStage = data.cycle?.current_stage ?? 1;
  const piId = data.cycle?.id;

  // Sync mode — determines whether pipeline dots are interactive
  const [syncMode, setSyncMode] = useState<'read_only' | 'read_write'>('read_only');
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'sync_mode')
      .maybeSingle()
      .then(({ data: row }: { data: { value: string } | null }) => {
        if (row?.value === 'read_write') setSyncMode('read_write');
      });
  }, []);

  // Optimistic stage control — dots flash immediately, rolls back if server rejects
  const [isPending, startTransition] = useTransition();
  const [optimisticStage, setOptimisticStage] = useOptimistic(rawStage);
  const stage = optimisticStage;

  const handleStageClick = (nextId: PlanningStageId) => {
    if (!piId || syncMode !== 'read_write' || nextId === stage) return;
    startTransition(async () => {
      setOptimisticStage(nextId);
      await setProgramIncrementStage(piId, nextId);
    });
  };

  const isInteractive = syncMode === 'read_write' && !!piId;

  // Realtime subscription + polling fallback
  useEffect(() => {
    if (!piId) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`dashboard-${piId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'features', filter: `planning_cycle_id=eq.${piId}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dependencies', filter: `planning_cycle_id=eq.${piId}` },
        () => router.refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'import_snapshots' },
        () => router.refresh(),
      )
      .subscribe();

    // 2-minute polling fallback (corporate networks drop WebSockets)
    const poll = setInterval(() => router.refresh(), 120_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [piId, router]);

  // Derived values
  const totalFeatures = data.summary.totalFeatures;
  const featuresWithSprint = data.artConvergence.reduce((s, a) => s + a.committed, 0);
  const overallPct = pct(featuresWithSprint, totalFeatures);
  const overallStatus = getConvergenceStatus(overallPct, stage);

  const parkingLotCount = totalFeatures - featuresWithSprint;
  const parkingLotStatus = getParkingLotStatus(parkingLotCount, stage);

  const highCritDeps = data.dependencyHealth.reduce(
    (acc, d) => ({ count: acc.count + d.highCriticalityCount, blocked: acc.blocked + (d.status === 'blocked' ? d.count : 0), atRisk: acc.atRisk + (d.status === 'at_risk' ? d.count : 0) }),
    { count: 0, blocked: 0, atRisk: 0 },
  );
  const depMetricStatus: ThresholdStatus = highCritDeps.blocked > 0 ? 'danger' : highCritDeps.atRisk > 0 ? 'warning' : 'success';

  const teamStatus: ThresholdStatus =
    data.teamCounts.participating < data.teamCounts.total ? 'danger' : 'success';

  const freshnessCard = getFreshnessCard(data.lastImportCreatedAt, stage);

  // Sprint load chart + median analysis
  const sprintLoadData = data.sprintLoad;
  const sprintTotals = sprintLoadData.map((s) => s.committed + s.planned);
  const sprintMedian = getSprintMedian(sprintTotals);
  const heaviestSprint = useMemo(() => {
    if (sprintLoadData.length === 0) return null;
    const max = sprintLoadData.reduce((a, b) =>
      a.committed + a.planned > b.committed + b.planned ? a : b,
    );
    return max.committed + max.planned > sprintMedian * 2 ? max : null;
  }, [sprintLoadData, sprintMedian]);

  const sprintLoadStatus: ThresholdStatus = (() => {
    if (!heaviestSprint) return 'success';
    const total = heaviestSprint.committed + heaviestSprint.planned;
    return total > sprintMedian * 3 ? 'danger' : 'warning';
  })();

  // ART convergence analysis for hero card
  const behindArts = data.artConvergence.filter((a) => {
    const threshold = convergenceThresholds[stage];
    if (!threshold) return false;
    return pct(a.committed, a.total) < threshold.successRange[0];
  });
  const onTrackArts = data.artConvergence.filter((a) => {
    const threshold = convergenceThresholds[stage];
    if (!threshold) return true;
    return pct(a.committed, a.total) >= threshold.successRange[0];
  });

  // Dependency health status
  const depHealthOverall: ThresholdStatus = (() => {
    const blocked = data.dependencyHealth.find((d) => d.status === 'blocked');
    if (blocked && blocked.count > 0) return 'danger';
    const atRisk = data.dependencyHealth.find((d) => d.status === 'at_risk');
    if (atRisk && atRisk.count > 0) return 'warning';
    return 'success';
  })();

  if (!data.cycle) {
    return (
      <div className="rounded border border-yellow-300 bg-yellow-50 p-6 text-sm text-textPrimary">
        No active Program Increment configured. Create or activate one in Admin
        Control Centre.
      </div>
    );
  }

  const nextStage = PLANNING_STAGES.find((s) => s.id === stage + 1);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <PageHeader
        title="Live Tracking Dashboard"
        subtitle={
          <>
            <span className="text-textMuted">
              {data.cycle.name} · {new Date(data.cycle.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
              {new Date(data.cycle.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </>
        }
      />

      {/* ── 1. Planning Stage pipeline ──────────────────────────────── */}
      <section className="rounded border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0">
            {PLANNING_STAGES.map((s, i) => {
              const isComplete = s.id < stage;
              const isActive = s.id === stage;
              const isFuture = s.id > stage;
              const canClick = isInteractive && !isPending && s.id !== stage;

              return (
                <div key={s.id} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={`h-0.5 w-6 sm:w-10 ${
                        isComplete || isActive ? 'bg-royalRed' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      disabled={!canClick}
                      onClick={() => canClick && handleStageClick(s.id)}
                      className={[
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-shadow',
                        isComplete
                          ? 'bg-royalRed text-white'
                          : isActive
                            ? 'bg-royalRed text-white ring-4 ring-red-200 animate-pulse'
                            : 'border-2 border-surfaceSubtle bg-surfaceSubtle text-textMuted',
                        canClick
                          ? 'cursor-pointer hover:ring-2 hover:ring-royalRed/30'
                          : 'cursor-default',
                      ].join(' ')}
                      aria-label={`Stage ${s.id}: ${s.shortLabel}, ${
                        isComplete ? 'complete' : isActive ? 'active' : 'upcoming'
                      }${canClick ? '. Click to set as current stage.' : ''}`}
                    >
                      {s.id}
                    </button>
                    <span
                      className={`mt-1 hidden text-[11px] sm:block ${
                        isFuture ? 'text-textMuted' : 'text-textPrimary'
                      }`}
                    >
                      {s.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ml-auto hidden text-right text-sm md:block">
            <p className="font-semibold text-textPrimary">
              Stage {stage}: {PLANNING_STAGES[stage - 1]?.shortLabel}
            </p>
            {nextStage && (
              <p className="text-xs text-textMuted">
                Next: {nextStage.shortLabel}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Overall convergence hero ─────────────────────────────── */}
      <section className="rounded border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="text-5xl font-medium text-textPrimary">{overallPct}%</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  overallStatus === 'success'
                    ? 'bg-success'
                    : overallStatus === 'warning'
                      ? 'bg-warning'
                      : 'bg-danger'
                }`}
                style={{ width: `${Math.min(100, overallPct)}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-textMuted">
              {featuresWithSprint} of {totalFeatures} features committed
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-textMuted">
              Stage {stage} target: {convergenceThresholds[stage]?.label ?? '—'}
            </p>
            <span className={`mt-1 inline-block ${statusPillClasses(overallStatus)}`}>
              {getConvergenceLabel(overallPct, stage)}
            </span>
            <p className="mt-2 text-xs text-textMuted">
              {getContextualReading('convergence', overallStatus, String(overallPct), String(stage))}
            </p>
          </div>
        </div>
        {(behindArts.length > 0 || onTrackArts.length > 0) && data.artConvergence.length > 1 && (
          <p className="mt-3 text-xs text-textMuted">
            {behindArts.length > 0 && (
              <>
                {behindArts.map((a) => a.shortName ?? a.name).join(', ')}{' '}
                {behindArts.length === 1 ? 'is' : 'are'} pulling the figure down.{' '}
              </>
            )}
            {onTrackArts.length > 0 && (
              <>
                {onTrackArts.map((a) => a.shortName ?? a.name).join(', ')}{' '}
                {onTrackArts.length === 1 ? 'is' : 'are'} on track.
              </>
            )}
          </p>
        )}
      </section>

      {/* ── 3. ART health strip ─────────────────────────────────────── */}
      <section className="flex flex-wrap gap-3">
        {data.artConvergence.map((art) => {
          const hasData = art.total > 0;
          const artPct = pct(art.committed, art.total);
          const artStatus = hasData ? getConvergenceStatus(artPct, stage) : 'success';
          const sc = hasData ? STATUS_COLOUR[artStatus] : null;

          return (
            <article
              key={art.artId}
              className={`flex-1 min-w-[200px] rounded border border-border bg-surface p-3 border-t-[3px] ${
                hasData ? sc!.border : 'border-neutral'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-textPrimary">
                    {art.shortName ?? art.name}
                  </p>
                  {art.shortName && (
                    <p className="text-xs text-textMuted">{art.name}</p>
                  )}
                </div>
                {hasData ? (
                  <p className={`text-2xl font-medium ${sc!.text}`}>{artPct}%</p>
                ) : (
                  <p className="text-2xl font-medium text-textMuted">—</p>
                )}
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
                {hasData && (
                  <div
                    className={`h-full rounded-full ${
                      artStatus === 'success'
                        ? 'bg-success'
                        : artStatus === 'warning'
                          ? 'bg-warning'
                          : 'bg-danger'
                    }`}
                    style={{ width: `${Math.min(100, artPct)}%` }}
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-textMuted">
                {hasData
                  ? `${art.committed}/${art.total} features · ${art.teamCount} teams`
                  : 'No features imported yet'}
              </p>
              {hasData ? (
                <span className={`mt-1 inline-block ${statusPillClasses(artStatus)}`}>
                  {getConvergenceLabel(artPct, stage)}
                </span>
              ) : (
                <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-textMuted">
                  No data
                </span>
              )}
            </article>
          );
        })}
        {data.artConvergence.length === 0 && (
          <p className="text-sm text-textMuted">No ART data for this PI.</p>
        )}
      </section>

      {/* Zone separator */}
      <div className="border-t border-border opacity-50" />

      {/* ── 4. Metrics strip ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* High-criticality deps */}
        <MetricCard
          label="High-criticality deps"
          value={highCritDeps.count}
          sub={`${highCritDeps.blocked} blocked · ${highCritDeps.atRisk} at risk`}
          status={depMetricStatus}
          reading={getContextualReading('dependencies', depMetricStatus)}
        />

        {/* Parking lot */}
        <MetricCard
          label="Parking lot"
          value={parkingLotCount}
          sub={`Features without a sprint`}
          status={parkingLotStatus}
          reading={getContextualReading('parkingLot', parkingLotStatus)}
        />

        {/* Teams participating */}
        <MetricCard
          label="Teams participating"
          value={data.teamCounts.participating}
          sub={`of ${data.teamCounts.total} active teams`}
          status={teamStatus}
          reading={
            teamStatus === 'danger'
              ? `${data.teamCounts.total - data.teamCounts.participating} team(s) not yet assigned`
              : 'All active teams assigned'
          }
        />

        {/* Data freshness */}
        <MetricCard
          label="Data freshness"
          value={freshnessCard.value}
          sub={freshnessCard.sub}
          status={freshnessCard.status}
          neutral={freshnessCard.isNeutral}
          reading={freshnessCard.reading}
        />
      </section>

      {/* Zone separator */}
      <div className="border-t border-border opacity-50" />

      {/* ── 5. Two-column: Sprint load + Dependency health ──────────── */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Sprint load chart (~60%) */}
        <article className="rounded border border-border bg-surface p-4 xl:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-textPrimary">
            Sprint Load Distribution
          </h2>
          {sprintLoadData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sprintLoadData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="sprintName"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar
                    dataKey="committed"
                    stackId="a"
                    fill="#16a34a"
                    name="Committed"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="planned"
                    stackId="a"
                    fill="#d97706"
                    name="Planned"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-2 text-xs text-textMuted">
                {getContextualReading(
                  'sprintLoad',
                  sprintLoadStatus,
                  heaviestSprint?.sprintName ?? '',
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-textMuted">No sprints configured.</p>
          )}
        </article>

        {/* Dependency health (~40%) */}
        <article className="rounded border border-border bg-surface p-4 xl:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-textPrimary">
            Dependency Health
          </h2>
          <ul className="space-y-2">
            {data.dependencyHealth.map((row) => {
              const meta = DEP_STATUS_META[row.status] ?? {
                shape: '?',
                label: row.status,
                colour: 'text-textMuted',
              };
              return (
                <li key={row.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`inline-block w-4 text-center text-base ${meta.colour}`}
                    >
                      {meta.shape}
                    </span>
                    <span className="sr-only">{meta.label}</span>
                    <span className="text-textPrimary">{meta.label}</span>
                  </div>
                  <span className="min-w-[2rem] text-right font-medium text-textPrimary">
                    {row.count}
                  </span>
                </li>
              );
            })}
          </ul>
          {highCritDeps.count > 0 && (
            <p className="mt-2 text-xs text-red-600">
              {highCritDeps.count} high-criticality {highCritDeps.count === 1 ? 'dependency requires' : 'dependencies require'} attention.
            </p>
          )}
          <p className="mt-2 text-xs text-textMuted">
            {getContextualReading('dependencies', depHealthOverall)}
          </p>
        </article>
      </section>

      {/* Concept section label + separator */}
      <div className="border-t border-border pt-1">
        <p className="text-center text-xs text-textMuted">Future capabilities</p>
      </div>

      {/* ── 6. Concept tiles ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Confidence Vote tile (static placeholder) */}
        <ConceptualTile
          title="Confidence Vote"
          description="Team confidence in delivering the committed plan"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-medium text-textPrimary">4.1</span>
            <span className="text-sm text-textMuted">/ 5</span>
            <span className="ml-1 text-warning" aria-label="4.1 out of 5 stars">
              ★★★★☆
            </span>
          </div>
          {/* Distribution bars */}
          <div className="flex items-end gap-1">
            {[
              { score: 1, count: 1, colour: 'bg-danger' },
              { score: 2, count: 2, colour: 'bg-danger' },
              { score: 3, count: 4, colour: 'bg-warning' },
              { score: 4, count: 12, colour: 'bg-success' },
              { score: 5, count: 10, colour: 'bg-success' },
            ].map((d) => (
              <div key={d.score} className="flex flex-col items-center gap-0.5">
                <div
                  className={`w-6 rounded-sm ${d.colour}`}
                  style={{ height: `${Math.max(4, d.count * 4)}px` }}
                />
                <span className="text-[11px] text-textMuted">{d.score}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-textMuted">22 of 29 teams scored 4 or 5</p>
        </ConceptualTile>

        {/* PI Objectives tile (static placeholder) */}
        <ConceptualTile
          title="PI Objectives"
          description="Committed and stretch objectives for this PI"
        >
          <div className="flex gap-4">
            <div>
              <span className="text-2xl font-medium text-textPrimary">12</span>
              <span className="ml-1 text-xs text-textMuted">committed</span>
            </div>
            <div>
              <span className="text-2xl font-medium text-textPrimary">4</span>
              <span className="ml-1 text-xs text-textMuted">stretch</span>
            </div>
            <div className="ml-auto text-right">
              <span className="text-lg font-medium text-textPrimary">7.4</span>
              <span className="ml-1 text-xs text-textMuted">avg BV</span>
            </div>
          </div>
          <ul className="space-y-1.5 text-xs">
            {[
              { title: 'Complete payment migration to new gateway', bv: 9, type: 'committed' as const },
              { title: 'Launch self-service returns portal', bv: 8, type: 'committed' as const },
              { title: 'Reduce P1 incidents by 30%', bv: 7, type: 'committed' as const },
              { title: 'Explore AI-assisted sorting predictions', bv: 5, type: 'stretch' as const },
            ].map((obj) => (
              <li key={obj.title} className="flex items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    obj.type === 'committed'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-textMuted'
                  }`}
                >
                  BV {obj.bv}
                </span>
                <span className="truncate text-textPrimary">{obj.title}</span>
                <span
                  className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                    obj.type === 'committed'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-textMuted'
                  }`}
                >
                  {obj.type === 'committed' ? 'Committed' : 'Stretch'}
                </span>
              </li>
            ))}
          </ul>
        </ConceptualTile>
      </section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  status,
  neutral = false,
  reading,
}: {
  label: string;
  value: number | string;
  sub: string;
  status: ThresholdStatus;
  neutral?: boolean;
  reading: string;
}) {
  const sc = STATUS_COLOUR[status];
  const topBorderClass = neutral ? 'border-border' : sc.border;
  return (
    <article
      className={`rounded border border-border bg-surface p-3 border-t-[3px] ${topBorderClass}`}
    >
      <p className="text-xs text-textMuted">{label}</p>
      <p className="mt-1 text-2xl font-medium text-textPrimary">{value}</p>
      <p className="text-xs text-textMuted">{sub}</p>
      {reading && <p className="mt-2 text-xs text-textMuted">{reading}</p>}
    </article>
  );
}
