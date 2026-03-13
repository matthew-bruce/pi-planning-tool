'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardData } from '@/lib/supabase/dashboard';

type Props = { initialData: DashboardData };

export function LiveDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [selectedArtId, setSelectedArtId] = useState(initialData.selectedArtId ?? 'ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
    setSelectedArtId(initialData.selectedArtId ?? 'ALL');
  }, [initialData]);

  const refresh = async (artId: string) => {
    const params = new URLSearchParams();
    if (data.cycle?.id) params.set('cycleId', data.cycle.id);
    if (artId !== 'ALL') params.set('artId', artId);
    setLoading(true);
    const response = await fetch(`/api/dashboard?${params.toString()}`);
    const payload = (await response.json()) as DashboardData;
    setData(payload);
    setLoading(false);
  };

  const maxSprintCount = useMemo(
    () => Math.max(1, ...data.sprintDistribution.map((item) => Math.max(item.featureCount, item.storyCount))),
    [data.sprintDistribution],
  );

  if (!data.cycle) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6 text-sm text-gray-700">
        No active planning cycle configured. Create or activate a cycle in Admin Control Centre.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live Tracking Dashboard</h1>
            <p className="text-sm text-gray-600">Real-time visibility of planning progress, dependencies and readiness</p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold">Cycle:</span> {data.cycle.name} ({new Date(data.cycle.start_date).toLocaleDateString('en-GB')} - {new Date(data.cycle.end_date).toLocaleDateString('en-GB')})
            </p>
            <p className="text-xs text-gray-500">Last refreshed at {new Date(data.refreshedAt).toLocaleTimeString('en-GB')}</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedArtId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedArtId(value);
                void refresh(value);
              }}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="ALL">All ARTs</option>
              {data.arts.map((art) => (
                <option key={art.id} value={art.id}>{art.name}</option>
              ))}
            </select>
            <button onClick={() => void refresh(selectedArtId)} className="rounded bg-royalRed px-3 py-1 text-sm text-white">
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Features', data.summary.totalFeatures],
          ['Total Stories', data.summary.totalStories],
          ['Participating Teams', data.summary.participatingTeams],
          ['Active Initiatives', data.summary.activeInitiatives],
          ['Total Dependencies', data.summary.totalDependencies],
          ['High Criticality Dependencies', data.summary.highCriticalityDependencies],
          ['Imports Today', data.summary.importsToday],
          ['Teams with Fresh Data', data.summary.teamsWithFreshData],
        ].map(([label, value]) => (
          <article key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">ART Status</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {data.artTiles.map((tile) => (
            <article key={tile.artId} className="rounded border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{tile.artName}</h3>
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-royalRed">Convergence {tile.convergencePct}%</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
                <p>Initiatives: {tile.initiatives}</p>
                <p>Teams: {tile.teamsContributing}</p>
                <p>Features: {tile.features}</p>
                <p>Dependencies: {tile.dependencies}</p>
                <p className="col-span-2 text-royalRed">High risk deps: {tile.unresolvedHighDependencies}</p>
              </div>
            </article>
          ))}
          {!data.artTiles.length && <p className="text-sm text-gray-500">No ART data found for this cycle.</p>}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Planning Convergence / Progress</h2>
          <div className="space-y-2">
            {[
              ['Draft', data.convergence.draft, 'bg-amber-400'],
              ['Planned', data.convergence.planned, 'bg-blue-500'],
              ['Committed', data.convergence.committed, 'bg-green-600'],
            ].map(([label, count, color]) => (
              <div key={String(label)}>
                <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span>{count}</span></div>
                <div className="h-3 rounded bg-gray-100">
                  <div className={`h-3 rounded ${color}`} style={{ width: `${Math.min(100, Number(count) * 8)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-700">{data.convergence.summary}</p>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Sprint Distribution</h2>
          <div className="space-y-2">
            {data.sprintDistribution.map((sprint) => (
              <div key={sprint.sprintId} className="rounded border border-gray-200 p-2">
                <p className="text-sm font-semibold">{sprint.sprintName}</p>
                <p className="text-xs text-gray-500">{sprint.dateRange}</p>
                <div className="mt-1 text-xs text-gray-700">Features: {sprint.featureCount} • Stories: {sprint.storyCount}</div>
                <div className="mt-1 h-2 rounded bg-gray-100">
                  <div className="h-2 rounded bg-royalRed" style={{ width: `${Math.max(4, (sprint.featureCount / maxSprintCount) * 100)}%` }} />
                </div>
              </div>
            ))}
            {!data.sprintDistribution.length && <p className="text-sm text-gray-500">No sprints configured for this cycle.</p>}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Dependency & Risk Overview</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">By Type</h3>
              <ul className="space-y-1 text-sm">
                {data.dependencyOverview.byType.map((item) => (
                  <li key={item.type} className="flex justify-between"><span>{item.type}</span><span>{item.count}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">By Criticality</h3>
              <ul className="space-y-1 text-sm">
                {data.dependencyOverview.byCriticality.map((item) => (
                  <li key={item.criticality} className="flex justify-between"><span>{item.criticality}</span><span>{item.count}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3">
            <h3 className="mb-1 text-sm font-semibold">Top dependency owners</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {data.dependencyOverview.topOwners.map((owner) => (
                <li key={owner.owner} className="flex justify-between"><span>{owner.owner}</span><span>{owner.count}</span></li>
              ))}
              {!data.dependencyOverview.topOwners.length && <li className="text-gray-500">No owner data available.</li>}
            </ul>
          </div>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Import Freshness / Snapshot Health</h2>
          <p className="text-sm text-gray-700">Latest import: {data.importFreshness.latestImportAt ? new Date(data.importFreshness.latestImportAt).toLocaleString('en-GB') : 'No imports yet'}</p>
          <p className="text-sm text-gray-700">Imported snapshots: {data.importFreshness.importedSnapshots} • Rolled back: {data.importFreshness.rolledBackSnapshots}</p>
          <p className="text-sm text-gray-700">Teams with no import: {data.importFreshness.teamsNoImport} • Stale teams: {data.importFreshness.teamsStale}</p>

          <div className="mt-3 max-h-48 overflow-auto rounded border border-gray-200">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr><th className="px-2 py-1 text-left">Team</th><th className="px-2 py-1 text-left">Latest import</th><th className="px-2 py-1 text-left">Status</th></tr>
              </thead>
              <tbody>
                {data.importFreshness.teamStatuses.map((row) => (
                  <tr key={row.team} className="border-t">
                    <td className="px-2 py-1">{row.team}</td>
                    <td className="px-2 py-1">{row.latestImportAt ? new Date(row.latestImportAt).toLocaleString('en-GB') : '-'}</td>
                    <td className="px-2 py-1">{row.freshness}</td>
                  </tr>
                ))}
                {!data.importFreshness.teamStatuses.length && (
                  <tr><td className="px-2 py-2 text-gray-500" colSpan={3}>No participating team freshness data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Activity Feed</h2>
          <ul className="max-h-64 space-y-2 overflow-auto text-sm">
            {data.activity.map((event) => (
              <li key={event.id} className="rounded border border-gray-200 p-2">
                <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString('en-GB')} • {event.eventType}</p>
                <p className="text-gray-800">{event.message}</p>
              </li>
            ))}
            {!data.activity.length && <li className="text-gray-500">No activity events recorded for this cycle.</li>}
          </ul>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Attention Items</h2>
          <ul className="space-y-2 text-sm">
            {data.attentionItems.map((item, index) => (
              <li key={`${item.message}-${index}`} className={`rounded border p-2 ${item.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {item.message}
              </li>
            ))}
            {!data.attentionItems.length && <li className="rounded border border-green-200 bg-green-50 p-2 text-green-700">No immediate attention items.</li>}
          </ul>
        </article>
      </section>
    </div>
  );
}
