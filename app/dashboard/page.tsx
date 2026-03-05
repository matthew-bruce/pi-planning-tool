'use client';

import { useDispatchStore } from '@/store/useDispatchStore';

export default function DashboardPage() {
  const { arts, initiatives, features, activityFeed } = useDispatchStore();

  const allocated = features.filter((f) => f.sprintId !== null).length;
  const unallocated = features.length - allocated;
  const riskCount = features.filter((f) => f.dependencyCounts.conflict > 0 || f.dependencyCounts.blocks > 1).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded p-4"><p className="text-gray-500">Total Features</p><p className="text-3xl font-bold">{features.length}</p></div>
        <div className="border rounded p-4"><p className="text-gray-500">Allocated</p><p className="text-3xl font-bold">{allocated}</p></div>
        <div className="border rounded p-4"><p className="text-gray-500">Risk Flags</p><p className="text-3xl font-bold text-royalRed">{riskCount}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {arts.map((art) => {
          const artInitiativeIds = initiatives.filter((i) => i.artId === art.id).map((i) => i.id);
          const artFeatures = features.filter((f) => artInitiativeIds.includes(f.initiativeId));
          const convergence = artFeatures.length ? Math.round((artFeatures.filter((f) => f.sprintId !== null).length / artFeatures.length) * 100) : 0;
          const artRisks = artFeatures.filter((f) => f.dependencyCounts.conflict > 0).length;
          return (
            <div key={art.id} className="border rounded p-3">
              <h3 className="font-semibold">{art.name}</h3>
              <p>Convergence: <span className="text-royalRed font-semibold">{convergence}%</span></p>
              <p>Risks: {artRisks}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        <div className="border rounded p-3">
          <h3 className="font-semibold mb-2">Sprint Distribution</h3>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((num) => {
              const count = features.filter((f) => f.sprintId === `sprint-${num}`).length;
              const width = `${Math.max(8, Math.round((count / features.length) * 100))}%`;
              return (
                <div key={num}>
                  <div className="text-xs mb-1">Sprint {num}: {count}</div>
                  <div className="h-3 bg-gray-100 rounded"><div className="h-3 bg-royalRed rounded" style={{ width }} /></div>
                </div>
              );
            })}
            <p className="text-xs mt-2">Parking Lot: {unallocated}</p>
          </div>
        </div>

        <div className="border rounded p-3 bg-gray-50">
          <h3 className="font-semibold mb-2">Activity Feed</h3>
          <ul className="space-y-2 text-sm max-h-72 overflow-auto">
            {activityFeed.slice(0, 20).map((evt) => (
              <li key={evt.id} className="border-b pb-1">
                <div className="text-xs text-gray-500">{new Date(evt.timestamp).toLocaleTimeString()}</div>
                <div>{evt.message}</div>
              </li>
            ))}
            {!activityFeed.length && <li className="text-gray-500 text-sm">No activity yet. Leave demo mode enabled.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
