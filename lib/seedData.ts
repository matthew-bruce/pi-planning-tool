import { DispatchData, Feature, Sprint } from '@/lib/models';

type InitiativeSeed = { name: string; teams: { name: string; platform: string }[] };

const arts = [
  { id: 'art-web-app', name: 'Web & App' },
  { id: 'art-ooh', name: 'Out Of Home' },
];

const webAppInitiatives: InitiativeSeed[] = [
  { name: 'Strategic Front End Framework', teams: [{ name: 'Helios', platform: 'WEB' }, { name: 'Pluto', platform: 'WEB' }] },
  { name: 'Strategic Demand', teams: [{ name: 'Nebula', platform: 'WEB' }] },
  { name: 'Customer Identity Access Management', teams: [{ name: 'Interstellar', platform: 'WEB' }, { name: 'Pulsar', platform: 'WEB' }] },
  { name: 'Digital Services Transformation', teams: [{ name: 'Dudley', platform: 'WEB' }] },
  { name: 'Legacy Web & App', teams: [{ name: 'Cosmos', platform: 'WEB' }, { name: 'Cygnus', platform: 'WEB' }] },
  { name: 'Legacy App', teams: [{ name: 'Mosaic', platform: 'APP' }] },
];

const outOfHomeInitiatives: InitiativeSeed[] = [
  { name: 'Out Of Home – Services Near You', teams: [{ name: 'Janus', platform: 'EPS' }, { name: 'Orion', platform: 'EPS' }, { name: 'Magnetar', platform: 'EPS' }] },
  { name: 'Out Of Home – Tracking & Receiving', teams: [{ name: 'Janus', platform: 'EPS' }, { name: 'Orion', platform: 'EPS' }] },
  { name: 'Out Of Home – Location Management', teams: [{ name: 'Magnetar', platform: 'EPS' }] },
  { name: 'EPS-X', teams: [{ name: 'Atlanteans', platform: 'EPS' }, { name: 'Titans', platform: 'EPS' }] },
  { name: 'Tracking Improvements', teams: [{ name: 'Olympians', platform: 'EPS' }, { name: 'Spartans', platform: 'EPS' }, { name: 'Samurai', platform: 'EPS' }] },
  { name: 'Route Optimisation', teams: [{ name: 'Pulse', platform: 'PDA' }, { name: 'Ignite', platform: 'PDA' }] },
  { name: 'Scanning & Tracking', teams: [{ name: 'Bumblebee', platform: 'PDA' }, { name: 'Crosshairs', platform: 'PDA' }, { name: 'Sideswipe', platform: 'PDA' }] },
  { name: 'Management Apps', teams: [{ name: 'Prometheus', platform: 'PDA' }, { name: 'Andromeda', platform: 'PDA' }] },
  { name: 'Small Changes', teams: [{ name: 'Ninjas', platform: 'PDA' }, { name: 'Inferno', platform: 'PDA' }] },
  { name: 'Strategic Integration', teams: [{ name: 'Integration Pool', platform: 'BIG' }] },
  { name: 'Legacy Integration', teams: [{ name: 'Integration Pool', platform: 'BIG' }] },
  { name: 'Migration', teams: [{ name: 'Integration Pool', platform: 'BIG' }] },
];

const titleBank = ['Checkout Revamp', 'Event Instrumentation', 'Routing Hardening', 'Identity Refresh', 'Mobile Sync', 'API Consistency', 'Performance Budget', 'Telemetry Uplift', 'Schema Migration', 'Comms Refactor'];

const prefixCounter: Record<string, number> = { WEB: 18000, APP: 28000, EPS: 38000, PDA: 48000, BIG: 58000 };
const nextTicket = (platform: string) => `${platform}-${prefixCounter[platform]++}`;

function buildSprints(): Sprint[] {
  const base = new Date('2026-03-25T00:00:00.000Z');
  return Array.from({ length: 6 }).map((_, index) => {
    const start = new Date(base);
    start.setUTCDate(base.getUTCDate() + index * 14);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 13);
    return {
      id: `sprint-${index + 1}`,
      number: index + 1,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  });
}

export function createSeedData(): DispatchData {
  const initiatives: DispatchData['initiatives'] = [];
  const teamsMap = new Map<string, DispatchData['teams'][number]>();

  const buildInitiatives = (artId: string, seeds: InitiativeSeed[]) => {
    seeds.forEach((seed, idx) => {
      const initiativeId = `${artId}-init-${idx + 1}`;
      initiatives.push({ id: initiativeId, artId, name: seed.name });
      seed.teams.forEach((team) => {
        if (!teamsMap.has(team.name)) {
          teamsMap.set(team.name, { id: `team-${team.name.toLowerCase().replace(/\s+/g, '-')}`, name: team.name, platform: team.platform });
        }
      });
    });
  };

  buildInitiatives('art-web-app', webAppInitiatives);
  buildInitiatives('art-ooh', outOfHomeInitiatives);

  const teams = Array.from(teamsMap.values());
  const sprints = buildSprints();
  const features: Feature[] = [];

  let featureCount = 1;
  initiatives.forEach((initiative, idx) => {
    const relatedTeams = (initiative.artId === 'art-web-app' ? webAppInitiatives : outOfHomeInitiatives)[
      initiative.artId === 'art-web-app' ? idx : idx - webAppInitiatives.length
    ]?.teams || [];

    relatedTeams.forEach((teamInfo) => {
      const team = teams.find((t) => t.name === teamInfo.name);
      if (!team) return;
      const cardCount = featureCount % 2 === 0 ? 2 : 3;
      for (let i = 0; i < cardCount; i++) {
        const sprint = sprints[(featureCount + i) % sprints.length];
        features.push({
          id: `feature-${featureCount}`,
          ticketKey: nextTicket(team.platform),
          title: `${titleBank[(featureCount + i) % titleBank.length]} ${team.name}`,
          initiativeId: initiative.id,
          teamId: team.id,
          sprintId: sprint.id,
          storyCount: 3 + ((featureCount + i) % 8),
          dependencyCounts: { requires: 0, blocks: 0, conflict: 0 },
        });
        featureCount += 1;
      }
    });
  });

  const parkingInitiatives = initiatives.slice(0, 10);
  for (let i = 0; i < 10; i++) {
    const initiative = parkingInitiatives[i % parkingInitiatives.length];
    const team = teams[(i * 3) % teams.length];
    features.push({
      id: `feature-${featureCount}`,
      ticketKey: nextTicket(team.platform),
      title: `Unallocated ${titleBank[i % titleBank.length]}`,
      initiativeId: initiative.id,
      teamId: team.id,
      sprintId: null,
      storyCount: 2 + (i % 8),
      dependencyCounts: { requires: 0, blocks: 0, conflict: 0 },
    });
    featureCount += 1;
  }

  const depPairs = [
    [features[0], features[12], 'requires'],
    [features[8], features[3], 'blocks'],
    [features[20], features[2], 'requires'],
    [features[32], features[40], 'blocks'],
    [features[15], features[16], 'conflict'],
    [features[50], features[10], 'requires'],
    [features[61], features[25], 'blocks'],
  ] as const;

  const dependencies = depPairs.map((pair, index) => ({
    id: `dep-${index + 1}`,
    sourceFeatureId: pair[0].id,
    targetFeatureId: pair[1].id,
    type: pair[2],
  }));

  dependencies.forEach((dep) => {
    const source = features.find((f) => f.id === dep.sourceFeatureId);
    const target = features.find((f) => f.id === dep.targetFeatureId);
    if (source) source.dependencyCounts[dep.type] += 1;
    if (target) target.dependencyCounts[dep.type] += 1;
  });

  return {
    arts,
    initiatives,
    teams,
    sprints,
    features,
    dependencies,
    activityFeed: [],
  };
}
