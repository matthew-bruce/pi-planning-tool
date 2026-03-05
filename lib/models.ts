export type Art = { id: string; name: string };

export type Initiative = { id: string; artId: string; name: string };

export type Team = { id: string; platform: string; name: string };

export type Sprint = {
  id: string;
  number: number;
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
  title: string;
  initiativeId: string;
  teamId: string;
  sprintId: string | null;
  storyCount: number;
  dependencyCounts: DependencyCounts;
};

export type DependencyType = 'requires' | 'blocks' | 'conflict';

export type Dependency = {
  id: string;
  sourceFeatureId: string;
  targetFeatureId: string;
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
