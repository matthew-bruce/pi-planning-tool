export type Art = {
  id: string;
  name: string;
  shortName?: string | null;
};

export type Initiative = { id: string; artId: string; name: string };

export type Team = {
  id: string;
  platform: string;
  name: string;
  teamType: 'stream-aligned' | 'platform' | 'enabling' | 'complicated-subsystem';
};

export type Sprint = {
  id: string;
  number: number;
  name?: string;
  startDate: string;
  endDate: string;
};

export type DependencyCounts = {
  requires: number;
  blocks: number;
  conflict: number;
};

export type Feature = {
  id: string;
  ticketKey: string;
  sourceKey?: string | null;
  title: string;
  initiativeId: string;
  teamId: string;
  sprintId: string | null;
  sourceUrl?: string | null;
  commitmentStatus?: string | null;
  status?: string | null;
  sourceSystem?: string | null;
  storyCount: number;
  dependencyCounts: DependencyCounts;
};

export type DependencyType = 'requires' | 'blocks' | 'conflict';

export type Dependency = {
  id: string;
  sourceFeatureId: string;
  targetFeatureId: string;
  sourceFeatureUuid?: string | null;
  targetFeatureUuid?: string | null;
  type: DependencyType;
};

export type ActivityEvent = {
  id: string;
  timestamp: string;
  type: 'move' | 'dependency' | 'story';
  message: string;
};

export type DispatchData = {
  arts: Art[];
  initiatives: Initiative[];
  teams: Team[];
  sprints: Sprint[];
  features: Feature[];
  dependencies: Dependency[];
  activityFeed: ActivityEvent[];
};
