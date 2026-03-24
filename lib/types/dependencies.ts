export type DependencyNode = {
  id: string;               // ticket_key
  type: 'feature' | 'external';
  ticket_key: string;
  title: string;
  team_name: string | null;
  platform_name: string | null;
  art_short_name: string | null;
  sprint_name: string | null;
  value_stream_name: string | null;
};

export type DependencyEdge = {
  id: string;
  source_ticket_key: string;
  target_ticket_key: string;
  dependency_type: string;
  criticality: 'High' | 'Medium' | 'Low' | null;
  owner: string | null;
  target_sprint: string | null;
  description: string | null;
};

export type DependenciesData = {
  planningCycleId: string;
  planningCycleName: string;
  arts: Array<{ id: string; name: string; short_name: string }>;
  selectedArtId: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
};
