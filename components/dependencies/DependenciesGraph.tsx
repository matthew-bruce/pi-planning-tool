'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import dagre from 'dagre';
import { GitBranch, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import 'reactflow/dist/style.css';
import type {
  DependenciesData,
  DependencyNode,
  DependencyEdge,
} from '@/lib/types/dependencies';

// ─── Constants ────────────────────────────────────────────────────────────────

const FEATURE_NODE_WIDTH = 220;
const FEATURE_NODE_HEIGHT = 90;
const EXTERNAL_NODE_WIDTH = 160;
const EXTERNAL_NODE_HEIGHT = 50;

const CRITICALITY_STROKE: Record<string, string> = {
  High: '#EE2722',
  Medium: '#d97706',
  Low: '#6b7280',
};

const ART_BORDER_COLOR: Record<string, string> = {
  WAA: '#EE2722', // royalRed
  OOH: '#3b82f6', // blue-500
};

function artBorderColor(artShortName: string | null): string {
  if (!artShortName) return '#d1d5db';
  return ART_BORDER_COLOR[artShortName] ?? '#d1d5db';
}

// ─── Custom node renderers ────────────────────────────────────────────────────

function FeatureNodeCard({
  data,
}: {
  data: {
    node: DependencyNode;
    isCrossArt: boolean;
    selectedArtShortName: string | null;
  };
}) {
  const { node, isCrossArt, selectedArtShortName: _ } = data;
  const border = artBorderColor(node.art_short_name);

  return (
    <div
      style={{
        width: FEATURE_NODE_WIDTH,
        height: FEATURE_NODE_HEIGHT,
        border: `${isCrossArt ? '1.5px dashed' : '1.5px solid'} ${border}`,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        cursor: 'pointer',
      }}
    >
      <span
        style={{ fontSize: 10, fontFamily: 'monospace', color: '#9ca3af' }}
      >
        {node.ticket_key}
      </span>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#1f2937',
          lineHeight: '1.35',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {node.title}
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 'auto' }}>
        {node.team_name ?? '—'}
      </span>
      {node.sprint_name && (
        <span
          style={{
            fontSize: 10,
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            borderRadius: 4,
            padding: '1px 6px',
            alignSelf: 'flex-start',
          }}
        >
          {node.sprint_name}
        </span>
      )}
    </div>
  );
}

function ExternalNodeCard({
  data,
}: {
  data: { node: DependencyNode; edgeType: string };
}) {
  const { node, edgeType } = data;
  return (
    <div
      style={{
        width: EXTERNAL_NODE_WIDTH,
        height: EXTERNAL_NODE_HEIGHT,
        border: '1.5px dashed #d1d5db',
        borderRadius: 8,
        backgroundColor: '#f9fafb',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#6b7280',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={node.ticket_key}
      >
        {node.ticket_key}
      </span>
      {edgeType && (
        <span
          style={{
            fontSize: 10,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            color: '#6b7280',
            borderRadius: 4,
            padding: '1px 6px',
            alignSelf: 'flex-start',
          }}
        >
          {edgeType}
        </span>
      )}
    </div>
  );
}

const nodeTypes = {
  featureNode: FeatureNodeCard,
  externalNode: ExternalNodeCard,
};

// ─── Dagre layout ─────────────────────────────────────────────────────────────

function applyDagreLayout(
  rfNodes: Node[],
  rfEdges: Edge[]
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 180, nodesep: 60 });

  rfNodes.forEach((n) => {
    const w =
      n.type === 'externalNode' ? EXTERNAL_NODE_WIDTH : FEATURE_NODE_WIDTH;
    const h =
      n.type === 'externalNode' ? EXTERNAL_NODE_HEIGHT : FEATURE_NODE_HEIGHT;
    g.setNode(n.id, { width: w, height: h });
  });
  rfEdges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const laid = rfNodes.map((n) => {
    const pos = g.node(n.id);
    const w =
      n.type === 'externalNode' ? EXTERNAL_NODE_WIDTH : FEATURE_NODE_WIDTH;
    const h =
      n.type === 'externalNode' ? EXTERNAL_NODE_HEIGHT : FEATURE_NODE_HEIGHT;
    return {
      ...n,
      position: { x: pos.x - w / 2, y: pos.y - h / 2 },
    };
  });

  return { nodes: laid, edges: rfEdges };
}

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({
  nodeId,
  nodes,
  edges,
  onClose,
}: {
  nodeId: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  onClose: () => void;
}) {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const outgoing = edges.filter((e) => e.source_ticket_key === nodeId);
  const incoming = edges.filter((e) => e.target_ticket_key === nodeId);

  function CritBadge({ c }: { c: DependencyEdge['criticality'] }) {
    const colors: Record<string, string> = {
      High: 'bg-red-100 text-red-700',
      Medium: 'bg-amber-100 text-amber-700',
      Low: 'bg-gray-100 text-gray-600',
    };
    if (!c) return null;
    return (
      <span
        className={`inline-flex items-center rounded-full px-1.5 text-xs font-medium ${colors[c] ?? colors.Low}`}
      >
        {c}
      </span>
    );
  }

  function TypeBadge({ t }: { t: string }) {
    return (
      <span className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-500">
        {t}
      </span>
    );
  }

  function EdgeRow({ edge, otherKey }: { edge: DependencyEdge; otherKey: string }) {
    return (
      <div className="border-b border-gray-100 py-2 last:border-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-xs text-gray-400">{otherKey}</span>
          <TypeBadge t={edge.dependency_type} />
          <CritBadge c={edge.criticality} />
        </div>
        {edge.owner && (
          <div className="mt-0.5 text-xs text-gray-500">Owner: {edge.owner}</div>
        )}
        {edge.target_sprint && (
          <div className="text-xs text-gray-400">Sprint: {edge.target_sprint}</div>
        )}
        {edge.description && (
          <div className="mt-1 text-xs text-gray-500 leading-snug">
            {edge.description}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="absolute right-0 top-0 z-10 h-full w-80 overflow-y-auto border-l border-gray-200 bg-white shadow-lg"
      style={{ width: 320 }}
    >
      <div className="flex items-start justify-between border-b border-gray-200 p-4">
        <div className="min-w-0">
          <div className="font-mono text-xs text-gray-400">{node.ticket_key}</div>
          <div className="mt-0.5 text-sm font-semibold text-gray-900 leading-snug">
            {node.title}
          </div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm">
        {node.type === 'feature' ? (
          <>
            {node.team_name && (
              <div>
                <span className="text-gray-400 text-xs">Team</span>
                <div className="text-gray-800">{node.team_name}</div>
              </div>
            )}
            {node.value_stream_name && (
              <div>
                <span className="text-gray-400 text-xs">Value Stream</span>
                <div className="text-gray-800">{node.value_stream_name}</div>
              </div>
            )}
            {node.sprint_name && (
              <div>
                <span className="text-gray-400 text-xs">Sprint</span>
                <div className="text-gray-800">{node.sprint_name}</div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded bg-gray-50 p-2 text-xs text-gray-500">
            External entity — no team or sprint context available.
          </div>
        )}

        {outgoing.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Depends on ({outgoing.length})
            </div>
            {outgoing.map((e) => (
              <EdgeRow key={e.id} edge={e} otherKey={e.target_ticket_key} />
            ))}
          </div>
        )}

        {incoming.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Required by ({incoming.length})
            </div>
            {incoming.map((e) => (
              <EdgeRow key={e.id} edge={e} otherKey={e.source_ticket_key} />
            ))}
          </div>
        )}

        {outgoing.length === 0 && incoming.length === 0 && (
          <div className="text-xs text-gray-400">No dependency edges for this node.</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DependenciesGraph({
  initialData,
}: {
  initialData: DependenciesData;
}) {
  const router = useRouter();
  const [data] = useState(initialData);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Map: external node ticket_key → first edge's dependency_type (for badge)
  const externalNodeEdgeType = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of data.edges) {
      const target = data.nodes.find(
        (n) => n.id === e.target_ticket_key && n.type === 'external'
      );
      if (target && !map.has(target.id)) {
        map.set(target.id, e.dependency_type);
      }
    }
    return map;
  }, [data]);

  // Set of target feature ART short names for cross-ART detection
  const selectedArt = data.arts.find((a) => a.id === data.selectedArtId);

  // Build reactflow nodes
  const rfNodes: Node[] = useMemo(
    () =>
      data.nodes.map((n) => {
        const isCrossArt =
          n.type === 'feature' &&
          !!selectedArt &&
          !!n.art_short_name &&
          n.art_short_name !== selectedArt.short_name;

        return {
          id: n.id,
          type: n.type === 'external' ? 'externalNode' : 'featureNode',
          position: { x: 0, y: 0 },
          data:
            n.type === 'external'
              ? { node: n, edgeType: externalNodeEdgeType.get(n.id) ?? '' }
              : { node: n, isCrossArt, selectedArtShortName: selectedArt?.short_name ?? null },
        };
      }),
    [data.nodes, selectedArt, externalNodeEdgeType]
  );

  // Build reactflow edges
  const rfEdges: Edge[] = useMemo(
    () =>
      data.edges.map((e) => {
        const stroke =
          CRITICALITY_STROKE[e.criticality ?? ''] ?? CRITICALITY_STROKE.Low;
        const strokeWidth =
          e.criticality === 'High' ? 2.5 : e.criticality === 'Medium' ? 2 : 1.5;

        return {
          id: e.id,
          source: e.source_ticket_key,
          target: e.target_ticket_key,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
          style: { stroke, strokeWidth },
        };
      }),
    [data.edges]
  );

  // Apply dagre layout
  const { nodes: laidNodes, edges: laidEdges } = useMemo(
    () => applyDagreLayout(rfNodes, rfEdges),
    [rfNodes, rfEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(laidNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(laidEdges);

  // Sync whenever the layout changes (ART switch re-renders the page with new initialData)
  useEffect(() => {
    setNodes(laidNodes);
    setEdges(laidEdges);
  }, [laidNodes, laidEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    []
  );

  // ART filter: push new searchParam, page server-fetches new data
  function selectArt(artId: string) {
    const params = new URLSearchParams();
    if (artId !== 'all') params.set('artId', artId);
    router.push(`/dependencies?${params.toString()}`);
  }

  const isDemo = data.planningCycleName.startsWith('DEMO —');

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (data.nodes.length === 0) {
    return (
      <div className="space-y-3">
        <PageHeader data={data} onSelectArt={selectArt} isDemo={isDemo} />
        <div className="flex flex-col items-center justify-center rounded border border-gray-200 bg-gray-50 py-20 text-center">
          <GitBranch size={32} className="text-gray-300 mb-3" />
          <div className="text-sm text-gray-500">
            No dependencies found for this ART
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader data={data} onSelectArt={selectArt} isDemo={isDemo} />

      {/* Graph + side panel wrapper */}
      <div
        className="relative rounded border border-gray-200 overflow-hidden"
        style={{ height: 'calc(100vh - 210px)' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            className="hidden lg:block"
            nodeColor={(n) =>
              n.type === 'externalNode' ? '#f3f4f6' : '#ffffff'
            }
          />
        </ReactFlow>

        {/* Side panel */}
        {selectedNodeId && (
          <SidePanel
            nodeId={selectedNodeId}
            nodes={data.nodes}
            edges={data.edges}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Page header (ART selector + title) ──────────────────────────────────────

function PageHeader({
  data,
  onSelectArt,
  isDemo,
}: {
  data: DependenciesData;
  onSelectArt: (artId: string) => void;
  isDemo: boolean;
}) {
  return (
    <div>
      {isDemo && (
        <div className="mb-3 rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Not live data — this is the Demo Program Increment dataset.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Dependencies Near You
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{data.planningCycleName}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.arts.map((art) => (
            <button
              key={art.id}
              onClick={() => onSelectArt(art.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                art.id === data.selectedArtId
                  ? 'bg-royalRed text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {art.short_name}
            </button>
          ))}
          {data.selectedArtId && (
            <button
              onClick={() => onSelectArt('all')}
              className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Show all ARTs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
