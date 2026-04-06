'use client';

import { useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  type Node,
  type Edge,
} from 'reactflow';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  DependenciesData,
  DependencyNode,
  DependencyEdge,
} from '@/lib/types/dependencies';

/* ── Design tokens (matching tailwind.config.ts) ── */
const TOKENS = {
  royalRed: '#EE2722',
  blue: '#3b82f6',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  neutral: '#6b7280',
  removed: '#d1d5db',
  surface: '#ffffff',
  surfaceSubtle: '#f9fafb',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textMuted: '#6b7280',
} as const;

/* ── Status → colour/style mapping ── */
type DepStatus = 'open' | 'at_risk' | 'blocked' | 'resolved' | 'removed';

const STATUS_CONFIG: Record<DepStatus, { colour: string; dashed: boolean; opacity: number; label: string }> = {
  open:     { colour: TOKENS.neutral, dashed: false, opacity: 1, label: 'Open' },
  at_risk:  { colour: TOKENS.warning, dashed: false, opacity: 1, label: 'At Risk' },
  blocked:  { colour: TOKENS.danger,  dashed: false, opacity: 1, label: 'Blocked' },
  resolved: { colour: TOKENS.success, dashed: true,  opacity: 1, label: 'Resolved' },
  removed:  { colour: TOKENS.removed, dashed: true,  opacity: 0.4, label: 'Removed' },
};

const ALL_STATUSES: DepStatus[] = ['open', 'at_risk', 'blocked', 'resolved', 'removed'];

const STATUS_PRIORITY: Record<DepStatus, number> = {
  blocked: 4, at_risk: 3, open: 2, resolved: 1, removed: 0,
};

function normaliseStatus(raw: string | null): DepStatus {
  const s = (raw ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  if (s in STATUS_CONFIG) return s as DepStatus;
  return 'open';
}

function criticalityStrokeWidth(crit: string | null): number {
  const c = (crit ?? '').toLowerCase();
  if (c === 'high') return 3;
  if (c === 'medium') return 2;
  return 1.5;
}

/* ── Node ART border colour ── */
function artBorderColour(shortName: string | null): string {
  const s = (shortName ?? '').toUpperCase();
  if (s === 'WAA') return TOKENS.royalRed;
  if (s === 'OOH') return TOKENS.blue;
  return TOKENS.neutral;
}

/* ── Worst status across connected edges ── */
function worstStatus(nodeId: string, edges: DependencyEdge[], overrides: Map<string, DepStatus>): DepStatus {
  let worst: DepStatus = 'removed';
  for (const e of edges) {
    if (e.sourceId !== nodeId && e.targetId !== nodeId) continue;
    const s = overrides.get(e.id) ?? normaliseStatus(e.status);
    if (STATUS_PRIORITY[s] > STATUS_PRIORITY[worst]) worst = s;
  }
  return worst;
}

/* ── Layout (LR columns) ── */
const FEATURE_W = 220;
const FEATURE_H = 90;
const EXTERNAL_W = 180;
const EXTERNAL_H = 60;
const GAP_X = 80;
const GAP_Y = 20;

function layoutNodes(nodes: DependencyNode[], edges: DependencyEdge[]) {
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
    let y = 0;
    col.forEach((node) => {
      const h = node.isExternal ? EXTERNAL_H : FEATURE_H;
      positions.set(node.id, { x: colIdx * (FEATURE_W + GAP_X), y });
      y += h + GAP_Y;
    });
  });

  return positions;
}

/* ── Props ── */
type Props = { initialData: DependenciesData };

/* ── Component ── */
export function DependenciesGraph({ initialData }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { arts, selectedArtId, nodes: graphNodes, edges: graphEdges } = initialData;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Map<string, DepStatus>>(new Map());

  const positions = useMemo(() => layoutNodes(graphNodes, graphEdges), [graphNodes, graphEdges]);

  /* ── Build ReactFlow nodes ── */
  const nodes: Node[] = useMemo(
    () =>
      graphNodes.map((n) => {
        const isSelected = selectedNodeId === n.id;

        if (n.isExternal) {
          return {
            id: n.id,
            position: positions.get(n.id) ?? { x: 0, y: 0 },
            style: {
              width: EXTERNAL_W,
              height: EXTERNAL_H,
              border: isSelected ? `2px solid ${TOKENS.royalRed}` : `2px dashed ${TOKENS.neutral}`,
              borderRadius: 16,
              background: TOKENS.surfaceSubtle,
              display: 'flex',
              flexDirection: 'column' as const,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 6,
            },
            data: {
              label: (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: TOKENS.textMuted, fontStyle: 'italic' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 10, color: TOKENS.textMuted, marginTop: 2 }}>
                    {n.ticketKey}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: 4,
                    padding: '1px 6px',
                    fontSize: 9,
                    borderRadius: 9999,
                    background: TOKENS.border,
                    color: TOKENS.textMuted,
                  }}>
                    External
                  </span>
                </div>
              ),
            },
          };
        }

        // Feature node
        const worst = worstStatus(n.id, graphEdges, statusOverrides);
        const statusConf = STATUS_CONFIG[worst];

        return {
          id: n.id,
          data: {
            label: (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: TOKENS.royalRed }}>
                  {n.ticketKey}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TOKENS.textPrimary,
                  marginTop: 2,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  lineHeight: '1.3',
                }}>
                  {n.title}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}>
                  {n.teamName && (
                    <span style={{ fontSize: 11, color: TOKENS.textMuted }}>{n.teamName}</span>
                  )}
                  <span style={{
                    fontSize: 9,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: statusConf.colour + '1a',
                    color: statusConf.colour,
                    fontWeight: 500,
                    marginLeft: 'auto',
                  }}>
                    {statusConf.label}
                  </span>
                </div>
              </div>
            ),
          },
          position: positions.get(n.id) ?? { x: 0, y: 0 },
          style: {
            width: FEATURE_W,
            height: FEATURE_H,
            border: isSelected
              ? `2px solid ${TOKENS.royalRed}`
              : `1px solid ${TOKENS.border}`,
            borderLeft: `4px solid ${artBorderColour(n.artShortName)}`,
            borderRadius: 8,
            padding: 8,
            background: TOKENS.surface,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          },
        };
      }),
    [graphNodes, graphEdges, positions, selectedNodeId, statusOverrides],
  );

  /* ── Build ReactFlow edges ── */
  const edges: Edge[] = useMemo(
    () =>
      graphEdges.map((e) => {
        const status = statusOverrides.get(e.id) ?? normaliseStatus(e.status);
        const conf = STATUS_CONFIG[status];
        const sw = criticalityStrokeWidth(e.criticality);

        return {
          id: e.id,
          source: e.sourceId,
          target: e.targetId,
          label: e.dependencyType ?? undefined,
          labelStyle: { fontSize: 10, fill: conf.colour },
          labelBgStyle: { fill: TOKENS.surface, fillOpacity: 0.85 },
          labelBgPadding: [4, 2] as [number, number],
          style: {
            stroke: conf.colour,
            strokeWidth: sw,
            strokeDasharray: conf.dashed ? '6 3' : undefined,
            opacity: conf.opacity,
          },
          className: status === 'blocked' ? 'dependency-edge-blocked' : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: conf.colour,
            width: 16,
            height: 16,
          },
        };
      }),
    [graphEdges, statusOverrides],
  );

  /* ── Side panel data ── */
  const selectedNode = graphNodes.find((n) => n.id === selectedNodeId);
  const selectedEdges = graphEdges.filter(
    (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
  );

  const handleArtChange = (artId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('artId', artId);
    router.push(`/dependencies?${params.toString()}`);
  };

  const closePanel = useCallback(() => setSelectedNodeId(null), []);

  const handleStatusPreview = (edgeId: string, newStatus: DepStatus) => {
    setStatusOverrides((prev) => {
      const next = new Map(prev);
      next.set(edgeId, newStatus);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-medium text-textPrimary">
        Dependencies Near You
      </h1>
      <div className="flex gap-3 h-[calc(100vh-210px)]">
        {/* Graph area */}
        <div className="flex-1 border border-border rounded-lg overflow-hidden">
          <div className="p-2 flex gap-2 border-b border-border bg-surfaceSubtle">
            <select
              className="border border-border rounded px-2 py-1 text-sm bg-surface"
              value={selectedArtId ?? ''}
              onChange={(e) => handleArtChange(e.target.value)}
            >
              {arts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-textMuted self-center">
              {nodes.length} nodes &middot; {edges.length} edges
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
            <MiniMap className="hidden lg:block" />

            {/* ── Legend ── */}
            <Panel position="bottom-left">
              <div
                className="rounded-lg shadow-sm"
                style={{
                  background: TOKENS.surface,
                  border: `1px solid ${TOKENS.border}`,
                  padding: 12,
                  maxWidth: 200,
                }}
              >
                {/* Status section */}
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 8 }}>
                  Dependency Status
                </div>
                {ALL_STATUSES.map((s) => {
                  const conf = STATUS_CONFIG[s];
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: conf.colour,
                        opacity: conf.opacity,
                        display: 'inline-block',
                        flexShrink: 0,
                        ...(s === 'blocked' ? { animation: 'dependency-pulse 1.5s ease-in-out infinite' } : {}),
                      }} />
                      <span style={{ fontSize: 12, color: TOKENS.textMuted }}>
                        {conf.label}
                        {conf.dashed && (
                          <span style={{ marginLeft: 4, fontSize: 10, color: TOKENS.textMuted }}>(dashed)</span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Criticality section */}
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginTop: 10, marginBottom: 8 }}>
                  Criticality
                </div>
                {[
                  { label: 'High', width: 3, char: '\u2501\u2501\u2501' },
                  { label: 'Medium', width: 2, char: '\u2500\u2500\u2500' },
                  { label: 'Low', width: 1.5, char: '\u254C\u254C\u254C' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: TOKENS.neutral, fontWeight: 700, letterSpacing: -1, width: 24 }}>
                      {item.char}
                    </span>
                    <span style={{ fontSize: 12, color: TOKENS.textMuted }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Side panel ── */}
        {selectedNode && (
          <aside
            className="shrink-0 overflow-y-auto"
            style={{
              width: 320,
              background: TOKENS.surface,
              borderLeft: `1px solid ${TOKENS.border}`,
              padding: 16,
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: TOKENS.royalRed }}>
                  {selectedNode.ticketKey}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: TOKENS.textPrimary, marginTop: 4 }}>
                  {selectedNode.title}
                </div>
              </div>
              <button
                onClick={closePanel}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: TOKENS.textMuted }}
              >
                <X size={16} />
              </button>
            </div>

            {selectedNode.isExternal && (
              <span
                className="inline-block mt-2 px-2 py-0.5 text-xs rounded"
                style={{ background: TOKENS.border, color: TOKENS.textMuted }}
              >
                External
              </span>
            )}

            {selectedNode.teamName && (
              <div className="mt-3">
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                  Team
                </div>
                <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>{selectedNode.teamName}</div>
              </div>
            )}

            {/* Connection list */}
            {selectedEdges.length > 0 && (
              <div className="mt-4 space-y-4">
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted }}>
                  Depends On ({selectedEdges.length})
                </div>
                {selectedEdges.map((edge) => {
                  const other = graphNodes.find(
                    (n) => n.id === (edge.sourceId === selectedNodeId ? edge.targetId : edge.sourceId)
                  );
                  const effectiveStatus = statusOverrides.get(edge.id) ?? normaliseStatus(edge.status);
                  const statusConf = STATUS_CONFIG[effectiveStatus];

                  return (
                    <div
                      key={edge.id}
                      className="rounded-lg"
                      style={{
                        border: `1px solid ${TOKENS.border}`,
                        padding: 12,
                      }}
                    >
                      {/* Status toggle */}
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 4 }}>
                        Status
                      </div>
                      <div
                        className="flex rounded-lg overflow-hidden"
                        style={{ border: `1px solid ${TOKENS.border}` }}
                      >
                        {ALL_STATUSES.map((s) => {
                          const sConf = STATUS_CONFIG[s];
                          const isActive = effectiveStatus === s;
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusPreview(edge.id, s)}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs transition-colors"
                              style={{
                                background: isActive ? TOKENS.surface : 'transparent',
                                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                                color: isActive ? TOKENS.textPrimary : TOKENS.textMuted,
                                fontWeight: isActive ? 500 : 400,
                              }}
                            >
                              <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: sConf.colour,
                                display: 'inline-block',
                                flexShrink: 0,
                              }} />
                              <span className="hidden xl:inline">{sConf.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: TOKENS.textMuted, fontStyle: 'italic', marginTop: 4 }}>
                        Preview only — changes are not saved
                      </div>

                      {/* Edge details */}
                      {edge.criticality && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            Criticality
                          </div>
                          <CriticalityBadge value={edge.criticality} />
                        </div>
                      )}

                      {edge.dependencyType && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            Type
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>{edge.dependencyType}</div>
                        </div>
                      )}

                      {edge.owner && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            Owner
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>{edge.owner}</div>
                        </div>
                      )}

                      {edge.targetSprint && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            Target Sprint
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>{edge.targetSprint}</div>
                        </div>
                      )}

                      {edge.description && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            Description
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>{edge.description}</div>
                        </div>
                      )}

                      {other && (
                        <div className="mt-3">
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: TOKENS.textMuted, marginBottom: 2 }}>
                            {edge.sourceId === selectedNodeId ? 'Target' : 'Source'}
                          </div>
                          <div style={{ fontSize: 13, color: TOKENS.textPrimary }}>
                            <span style={{ fontFamily: 'monospace', color: TOKENS.royalRed }}>{other.ticketKey}</span>
                            {' '}{other.title}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ── Criticality badge ── */
function CriticalityBadge({ value }: { value: string }) {
  const c = value.toLowerCase();
  let className = 'inline-block px-2 py-0.5 text-xs rounded font-medium ';
  if (c === 'high') className += 'bg-red-100 text-red-700';
  else if (c === 'medium') className += 'bg-amber-100 text-amber-700';
  else className += 'bg-gray-100 text-gray-600';
  return <span className={className}>{value}</span>;
}
