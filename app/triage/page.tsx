'use client';

import { useDispatchStore } from '@/store/useDispatchStore';

export default function TriagePage() {
  const { initiatives, teams, sprints, features, updateFeatureAllocation } = useDispatchStore();

  const unallocated = features.filter((f) => f.sprintId === null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-3">Bulk Triage</h1>
      <div className="mb-4 rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        ⚠ Bulk Triage is not yet connected to live data. Figures shown are for demonstration purposes only.
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Ticket</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Initiative</th>
              <th className="p-2 text-left">Team</th>
              <th className="p-2 text-left">Sprint</th>
            </tr>
          </thead>
          <tbody>
            {unallocated.map((feature) => (
              <tr key={feature.id} className="border-t">
                <td className="p-2 font-semibold text-royalRed">{feature.ticketKey}</td>
                <td className="p-2">{feature.title}</td>
                <td className="p-2">
                  <select value={feature.initiativeId} onChange={(e) => updateFeatureAllocation(feature.id, e.target.value, feature.teamId, feature.sprintId)} className="border rounded px-2 py-1">
                    {initiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select value={feature.teamId} onChange={(e) => updateFeatureAllocation(feature.id, feature.initiativeId, e.target.value, feature.sprintId)} className="border rounded px-2 py-1">
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.platform})</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select value={feature.sprintId ?? ''} onChange={(e) => updateFeatureAllocation(feature.id, feature.initiativeId, feature.teamId, e.target.value || null)} className="border rounded px-2 py-1">
                    <option value="">Unallocated</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>Sprint {s.number}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!unallocated.length && <tr><td className="p-3 text-gray-500" colSpan={5}>No unallocated features.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
