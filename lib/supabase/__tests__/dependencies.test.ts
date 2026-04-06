import { describe, expect, it } from 'vitest';
import type { DependencyNode, DependencyEdge } from '@/lib/types/dependencies';

// Since getDependenciesData calls Supabase, we test the type contracts
// and edge/node structure that the component relies on.

describe('DependencyEdge type contract', () => {
  it('represents a valid edge with all fields', () => {
    const edge: DependencyEdge = {
      id: 'dep-1',
      sourceId: 'feat-1',
      targetId: 'feat-2',
      dependencyType: 'Team',
      criticality: 'High',
      status: 'Open',
      owner: 'Platform Team',
      description: 'Needs API ready',
    };

    expect(edge.sourceId).toBe('feat-1');
    expect(edge.targetId).toBe('feat-2');
    expect(edge.status).toBe('Open');
  });

  it('allows null optional fields', () => {
    const edge: DependencyEdge = {
      id: 'dep-2',
      sourceId: 'feat-1',
      targetId: 'ext-ServiceNow',
      dependencyType: null,
      criticality: null,
      status: null,
      owner: null,
      description: null,
    };

    expect(edge.criticality).toBeNull();
    expect(edge.status).toBeNull();
  });
});

describe('DependencyNode type contract', () => {
  it('represents an internal feature node', () => {
    const node: DependencyNode = {
      id: 'feat-1',
      ticketKey: 'FEAT-001',
      title: 'Checkout Flow',
      teamName: 'Platform',
      isExternal: false,
    };

    expect(node.isExternal).toBe(false);
    expect(node.teamName).toBe('Platform');
  });

  it('represents an external dependency node', () => {
    const node: DependencyNode = {
      id: 'ext-ServiceNow',
      ticketKey: 'ServiceNow',
      title: 'External',
      teamName: null,
      isExternal: true,
    };

    expect(node.isExternal).toBe(true);
    expect(node.teamName).toBeNull();
  });
});

describe('edge-to-node consistency', () => {
  it('every edge references existing node IDs', () => {
    const nodes: DependencyNode[] = [
      { id: 'feat-1', ticketKey: 'FEAT-001', title: 'A', teamName: null, isExternal: false },
      { id: 'feat-2', ticketKey: 'FEAT-002', title: 'B', teamName: null, isExternal: false },
      { id: 'ext-Infra', ticketKey: 'Infra', title: 'Infrastructure', teamName: null, isExternal: true },
    ];

    const edges: DependencyEdge[] = [
      { id: 'dep-1', sourceId: 'feat-1', targetId: 'feat-2', dependencyType: 'Team', criticality: 'High', status: 'Open', owner: null, description: null },
      { id: 'dep-2', sourceId: 'feat-1', targetId: 'ext-Infra', dependencyType: 'Infrastructure', criticality: 'Medium', status: null, owner: null, description: null },
    ];

    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.sourceId)).toBe(true);
      expect(nodeIds.has(edge.targetId)).toBe(true);
    }
  });

  it('filters out edges with missing nodes', () => {
    const nodes: DependencyNode[] = [
      { id: 'feat-1', ticketKey: 'FEAT-001', title: 'A', teamName: null, isExternal: false },
    ];

    const rawEdges: DependencyEdge[] = [
      { id: 'dep-1', sourceId: 'feat-1', targetId: 'feat-missing', dependencyType: 'Team', criticality: null, status: null, owner: null, description: null },
    ];

    const nodeIds = new Set(nodes.map((n) => n.id));
    const validEdges = rawEdges.filter(
      (e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)
    );

    expect(validEdges).toHaveLength(0);
  });
});
