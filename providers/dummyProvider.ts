import { createSeedData } from '@/lib/seedData';
import { DataProvider, SimulationMutation } from '@/providers/dataProvider';

export const dummyProvider: DataProvider = {
  getInitialData() {
    return createSeedData();
  },
  createRandomMutation(data) {
    if (!data.features.length) return null;
    const roll = Math.random();
    if (roll < 0.34) {
      const feature = data.features[Math.floor(Math.random() * data.features.length)];
      const sprintOptions = [null, ...data.sprints.map((s) => s.id)];
      const sprintId = sprintOptions[Math.floor(Math.random() * sprintOptions.length)];
      return {
        type: 'move',
        featureId: feature.id,
        sprintId,
        message: `${feature.ticketKey} moved to ${sprintId ?? 'Parking Lot'} by demo simulator`,
      };
    }

    if (roll < 0.67) {
      const source = data.features[Math.floor(Math.random() * data.features.length)];
      const target = data.features[Math.floor(Math.random() * data.features.length)];
      if (source.id === target.id) return null;
      const dependencyType = ['requires', 'blocks', 'conflict'][Math.floor(Math.random() * 3)] as 'requires' | 'blocks' | 'conflict';
      return {
        type: 'dependency',
        sourceFeatureId: source.id,
        targetFeatureId: target.id,
        dependencyType,
        message: `Dependency ${dependencyType} added: ${source.ticketKey} → ${target.ticketKey}`,
      };
    }

    const feature = data.features[Math.floor(Math.random() * data.features.length)];
    const storyCount = Math.max(1, feature.storyCount + (Math.random() > 0.5 ? 1 : -1));
    return {
      type: 'story',
      featureId: feature.id,
      storyCount,
      message: `${feature.ticketKey} story count updated to ${storyCount}`,
    };
  },
  toActivityEvent(mutation) {
    return {
      id: `activity-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type: mutation.type,
      message: mutation.message,
    };
  },
};
