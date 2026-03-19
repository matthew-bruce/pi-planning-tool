'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import { useDispatchStore } from '@/store/useDispatchStore';

export default function DependenciesPage() {
  const { selectedArtId, initiatives, teams, features, dependencies } = useDispatchStore();
  const [initiativeFilter, setInitiativeFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const artInitiatives = initiatives.filter((i) => i.artId === selectedArtId);
  const filteredFeatures = features.filter((f) => {
    const initOk = artInitiatives.some((i) => i.id === f.initiativeId);
    const team = teams.find((t) => t.id === f.teamId);
    return initOk && (initiativeFilter === 'ALL' || f.initiativeId === initiativeFilter) && (platformFilter === 'ALL' || team?.platform === platformFilter);
  });

  const nodes = useMemo(
    () =>
      filteredFeatures.map((f, idx) => ({
        id: f.id,
        data: { label: `${f.ticketKey}: ${f.title}` },
        position: { x: (idx % 6) * 220, y: Math.floor(idx / 6) * 100 },
        style: { border: selectedNodeId === f.id ? '2px solid #CC0000' : '1px solid #d1d5db', borderRadius: 8, padding: 4 },
      })),
    [filteredFeatures, selectedNodeId],
  );

  const edges = dependencies
    .filter((d) => filteredFeatures.some((f) => f.id === d.sourceFeatureId) && filteredFeatures.some((f) => f.id === d.targetFeatureId))
    .map((dep) => ({ id: dep.id, source: dep.sourceFeatureId, target: dep.targetFeatureId, label: dep.type, animated: dep.type === 'blocks' }));

  const selectedFeature = filteredFeatures.find((f) => f.id === selectedNodeId);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-gray-900">Dependencies Near You</h1>
    <div className="flex gap-3 h-[calc(100vh-210px)]">
      <div className="flex-1 border rounded">
        <div className="p-2 flex gap-2 border-b">
          <select className="border rounded px-2" value={initiativeFilter} onChange={(e) => setInitiativeFilter(e.target.value)}>
            <option value="ALL">All initiatives</option>
            {artInitiatives.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select className="border rounded px-2" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            <option value="ALL">All platforms</option>
            {Array.from(new Set(teams.map((t) => t.platform))).map((platform) => <option key={platform}>{platform}</option>)}
          </select>
        </div>
        <ReactFlow nodes={nodes} edges={edges} onNodeClick={(_, node) => setSelectedNodeId(node.id)} fitView>
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <aside className="w-72 border rounded p-3 bg-gray-50">
        <h3 className="font-semibold">Feature details</h3>
        {selectedFeature ? (
          <div className="text-sm mt-2 space-y-2">
            <p className="font-semibold text-royalRed">{selectedFeature.ticketKey}</p>
            <p>{selectedFeature.title}</p>
            <p>Stories: {selectedFeature.storyCount}</p>
            <p>Dependencies: R{selectedFeature.dependencyCounts.requires}/B{selectedFeature.dependencyCounts.blocks}/C{selectedFeature.dependencyCounts.conflict}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">Click a node to inspect.</p>
        )}
      </aside>
    </div>
    </div>
  );
}
