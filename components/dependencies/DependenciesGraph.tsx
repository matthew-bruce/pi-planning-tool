'use client';

import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type Node, type Edge } from 'reactflow';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DependenciesData, DependencyNode, DependencyEdge } from '@/lib/types/dependencies';

type Props = { initialData: DependenciesData };

const CRITICALITY_COLOURS: Record<string, string> = {
  high: '#dc2626',
  medium: '#f59e0b',
  low: '#6b7280',
};

function layoutNodes(nodes: DependencyNode[], edges: DependencyEdge[]) {
  // Simple LR grid layout — dagre not available, so use adjacency-aware positioning
  const NODE_W = 220;
  const NODE_H = 80;
  const GAP_X = 60;
  const GAP_Y = 30;

  // Group sources on the left, pure targets on the right, shared in the middle
  const sourceIds = new Set(edges.map((e) => e.sourceId));
  const targetIds = new Set(edges.map((e) => e.targetId));

  const columns: DependencyNode[][] = [[], [], []];
  for (const node of nodes) {
    const isSource = sourceIds.has(node.id);
    const isTarget = targetIds.has(node.id);
    if (isSource && !isTarget) columns[0].push(node);
    else if (isSource && isTarget) columns[1].push(node);
    else columns[2].push(node);
  }

  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((col, colIdx) => {
    col.forEach((node, rowIdx) => {
      positions.set(node.id, {
        x: colIdx * (NODE_W + GAP_X),
        y: rowIdx * (NODE_H + GAP_Y),
      });
    });
  });

  return positions;
}

export function DependenciesGraph({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { arts, selectedArtId, nodes: graphNodes, edges: graphEdges } = initialData;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const positions = useMemo(() => layoutNodes(graphNodes, graphEdges), [graphNodes, graphEdges]);

  const nodes: Node[] = useMemo(
    () =>
      graphNodes.map((n) => ({
        id: n.id,
        data: {
          label: n.isExternal
            ? `⬡ ${n.ticketKey}`
            : `${n.ticketKey}: ${n.title}`,
        },
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        style: {
          border:
            selectedNodeId === n.id
              ? '2px solid #CC0000'
              : n.isExternal
                ? '2px dashed #9ca3af'
                : '1px solid #d1d5db',
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          background: n.isExternal ? '#f9fafb' : '#ffffff',
          maxWidth: 200,
        },
      })),
    [graphNodes, positions, selectedNodeId],
  );

  const edges: Edge[] = useMemo(
    () =>
      graphEdges.map((e) => {
        const colour =
          CRITICALITY_COLOURS[(e.criticality ?? '').toLowerCase()] ?? '#6b7280';
        return {
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          label: e.dependencyType ?? undefined,
          animated: (e.criticality ?? '').toLowerCase() === 'high',
          style: { stroke: colour, strokeWidth: 2 },
          labelStyle: { fontSize: 10 },
        };
      }),
    [graphEdges],
  );

  const selectedNode = graphNodes.find((n) => n.id === selectedNodeId);
  const selectedEdges = graphEdges.filter(
    (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
  );

  const handleArtChange = (artId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('artId', artId);
    router.push(`/dependencies?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold text-gray-900">
        Dependencies Near You
      </h1>
      <div className="flex gap-3 h-[calc(100vh-210px)]">
        <div className="flex-1 border rounded">
          <div className="p-2 flex gap-2 border-b">
            <select
              className="border rounded px-2"
              value={selectedArtId ?? ''}
              onChange={(e) => handleArtChange(e.target.value)}
            >
              {arts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 self-center">
              {nodes.length} nodes · {edges.length} edges
            </span>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        <aside className="w-72 border rounded p-3 bg-gray-50 overflow-y-auto">
          <h3 className="font-semibold">Dependency details</h3>
          {selectedNode ? (
            <div className="text-sm mt-2 space-y-3">
              <div>
                <p className="font-semibold text-royalRed">
                  {selectedNode.ticketKey}
                </p>
                <p>{selectedNode.title}</p>
                {selectedNode.teamName && (
                  <p className="text-gray-500">{selectedNode.teamName}</p>
                )}
                {selectedNode.isExternal && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                    External
                  </span>
                )}
              </div>
              {selectedEdges.length > 0 && (
                <div>
                  <p className="font-medium">
                    Connections ({selectedEdges.length})
                  </p>
                  <ul className="mt-1 space-y-2">
                    {selectedEdges.map((edge) => {
                      const other = graphNodes.find(
                        (n) =>
                          n.id ===
                          (edge.sourceId === selectedNodeId
                            ? edge.targetId
                            : edge.sourceId)
                      );
                      return (
                        <li key={edge.id} className="border-l-2 pl-2" style={{ borderColor: CRITICALITY_COLOURS[(edge.criticality ?? '').toLowerCase()] ?? '#6b7280' }}>
                          <p className="font-medium">{other?.ticketKey}</p>
                          <p className="text-gray-500">
                            {edge.dependencyType}
                            {edge.criticality && ` · ${edge.criticality}`}
                            {edge.status && ` · ${edge.status}`}
                          </p>
                          {edge.description && (
                            <p className="text-gray-400 text-xs">
                              {edge.description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">
              Click a node to inspect.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
