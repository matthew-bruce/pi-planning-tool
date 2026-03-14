export type DashboardData = {
  cycle: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  } | null;
  arts: Array<{ id: string; name: string }>;
  selectedArtId: string | null;
  refreshedAt: string;
  summary: {
    totalFeatures: number;
    totalStories: number;
    participatingTeams: number;
    activeInitiatives: number;
    totalDependencies: number;
    highCriticalityDependencies: number;
    importsToday: number;
    teamsWithFreshData: number;
  };
  artTiles: Array<{
    artId: string;
    artName: string;
    initiatives: number;
    teamsContributing: number;
    features: number;
    dependencies: number;
    unresolvedHighDependencies: number;
    convergencePct: number;
  }>;
  convergence: {
    draft: number;
    planned: number;
    committed: number;
    summary: string;
  };
  sprintDistribution: Array<{
    sprintId: string;
    sprintName: string;
    dateRange: string;
    featureCount: number;
    storyCount: number;
  }>;
  dependencyOverview: {
    byType: Array<{ type: string; count: number }>;
    byCriticality: Array<{ criticality: string; count: number }>;
    topOwners: Array<{ owner: string; count: number }>;
  };
  importFreshness: {
    latestImportAt: string | null;
    importedSnapshots: number;
    rolledBackSnapshots: number;
    teamsNoImport: number;
    teamsStale: number;
    teamStatuses: Array<{
      team: string;
      latestImportAt: string | null;
      freshness: 'Fresh' | 'Stale' | 'Missing';
    }>;
  };
  activity: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    message: string;
  }>;
  attentionItems: Array<{
    severity: 'high' | 'medium';
    message: string;
  }>;
};
