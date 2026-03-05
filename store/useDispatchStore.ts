'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DispatchData } from '@/lib/models';
import { dummyProvider } from '@/providers/dummyProvider';

const provider = dummyProvider;

type ViewDensity = 'compact' | 'detailed';

type DispatchState = DispatchData & {
  selectedArtId: string;
  demoMode: boolean;
  density: ViewDensity;
  hydrateSeed: () => void;
  setSelectedArtId: (artId: string) => void;
  setDemoMode: (enabled: boolean) => void;
  setDensity: (density: ViewDensity) => void;
  assignFeatureSprint: (featureId: string, sprintId: string | null) => void;
  updateFeatureAllocation: (featureId: string, initiativeId: string, teamId: string, sprintId: string | null) => void;
  addDependency: (sourceFeatureId: string, targetFeatureId: string, type: 'requires' | 'blocks' | 'conflict') => void;
  updateStoryCount: (featureId: string, storyCount: number) => void;
  runSimulationTick: () => void;
};

const seeded = provider.getInitialData();

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      ...seeded,
      selectedArtId: seeded.arts[0].id,
      demoMode: true,
      density: 'compact',
      hydrateSeed: () => set((state) => (state.features.length ? state : { ...seeded })),
      setSelectedArtId: (selectedArtId) => set({ selectedArtId }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setDensity: (density) => set({ density }),
      assignFeatureSprint: (featureId, sprintId) =>
        set((state) => ({
          features: state.features.map((f) => (f.id === featureId ? { ...f, sprintId } : f)),
        })),
      updateFeatureAllocation: (featureId, initiativeId, teamId, sprintId) =>
        set((state) => ({
          features: state.features.map((f) => (f.id === featureId ? { ...f, initiativeId, teamId, sprintId } : f)),
        })),
      addDependency: (sourceFeatureId, targetFeatureId, type) =>
        set((state) => ({
          dependencies: [
            ...state.dependencies,
            { id: `dep-${Date.now()}`, sourceFeatureId, targetFeatureId, type },
          ],
          features: state.features.map((f) =>
            f.id === sourceFeatureId || f.id === targetFeatureId
              ? { ...f, dependencyCounts: { ...f.dependencyCounts, [type]: f.dependencyCounts[type] + 1 } }
              : f,
          ),
        })),
      updateStoryCount: (featureId, storyCount) =>
        set((state) => ({
          features: state.features.map((f) => (f.id === featureId ? { ...f, storyCount } : f)),
        })),
      runSimulationTick: () => {
        const state = get();
        if (!state.demoMode) return;
        const mutation = provider.createRandomMutation(state);
        if (!mutation) return;

        if (mutation.type === 'move') get().assignFeatureSprint(mutation.featureId, mutation.sprintId);
        if (mutation.type === 'dependency') get().addDependency(mutation.sourceFeatureId, mutation.targetFeatureId, mutation.dependencyType);
        if (mutation.type === 'story') get().updateStoryCount(mutation.featureId, mutation.storyCount);

        set((current) => ({
          activityFeed: [provider.toActivityEvent(mutation), ...current.activityFeed].slice(0, 80),
        }));
      },
    }),
    {
      name: 'dispatch-demo-state-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        arts: state.arts,
        initiatives: state.initiatives,
        teams: state.teams,
        sprints: state.sprints,
        features: state.features,
        dependencies: state.dependencies,
        activityFeed: state.activityFeed,
        selectedArtId: state.selectedArtId,
        demoMode: state.demoMode,
        density: state.density,
      }),
    },
  ),
);
