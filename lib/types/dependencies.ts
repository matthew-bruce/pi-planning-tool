export type DependencyNode = {
  id: string;
  ticketKey: string;
  title: string;
  teamName: string | null;
  artShortName: string | null;
  isExternal: boolean;
};

export type DependencyEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  dependencyType: string | null;
  criticality: string | null;
  status: string | null;
  owner: string | null;
  description: string | null;
  targetSprint: string | null;
};

export type DependenciesData = {
  cycle: {
    id: string;
    name: string;
  } | null;
  arts: Array<{ id: string; name: string; short_name: string | null }>;
  selectedArtId: string | null;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
};
