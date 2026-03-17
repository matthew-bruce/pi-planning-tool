export type PlanningCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  sprint_count: number;
  sprint_length_days: number;
  is_active: boolean;
  is_archived: boolean;
  current_stage: number;
  updated_at: string;
};

export type Sprint = {
  id: string;
  planning_cycle_id: string;
  sprint_number: number;
  name: string;
  start_date: string;
  end_date: string;
};

export type Platform = { id: string; name: string; is_active: boolean };

export type Art = {
  id: string;
  name: string;
  short_name: string | null;
  is_active: boolean;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  platform_id: string | null;
  is_active: boolean;
  team_type: 'stream-aligned' | 'platform' | 'enabling' | 'complicated-subsystem';
  updated_at: string;
};

export type Initiative = {
  id: string;
  name: string;
  art_id: string | null;
  planning_cycle_id: string | null;
  is_active: boolean;
  updated_at: string;
};

export type TeamCycleParticipation = {
  id: string;
  planning_cycle_id: string;
  team_id: string;
  is_participating: boolean;
};

export type TeamArtAssignment = {
  id: string;
  planning_cycle_id: string;
  team_id: string;
  art_id: string;
  created_at: string;
};

export type ImportSnapshot = {
  id: string;
  planning_cycle_id: string;
  imported_at: string;
  created_at: string;
  updated_at: string;
  file_name: string;
  source_system: string;
  row_count: number;
  status: string;
};

export type AppSettings = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
};

export type GeneratedSprintPreview = {
  sprint_number: number;
  name: string;
  start_date: string;
  end_date: string;
};

export type CsvMappedRow = Record<string, string>;


export type CycleReadinessSummary = {
  cycleId: string;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  isActiveCycle: boolean;
  configuredSprintCount: number;
  participatingTeamsCount: number;
  totalActiveTeamsCount: number;
  activeInitiativesCount: number;
  importCount: number;
  freshnessSummary: string;
  readinessStatus: 'Ready' | 'At Risk' | 'Needs Attention' | 'Not Active';
  attentionItems: string[];
};
