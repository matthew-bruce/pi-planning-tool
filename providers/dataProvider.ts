import { ActivityEvent, DependencyType, DispatchData } from '@/lib/models';

export type SimulationMutation =
  | { type: 'move'; featureId: string; sprintId: string | null; message: string }
  | { type: 'dependency'; sourceFeatureId: string; targetFeatureId: string; dependencyType: DependencyType; message: string }
  | { type: 'story'; featureId: string; storyCount: number; message: string };

export interface DataProvider {
  getInitialData(): DispatchData;
  createRandomMutation(data: DispatchData): SimulationMutation | null;
  toActivityEvent(mutation: SimulationMutation): ActivityEvent;
}
