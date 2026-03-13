import { listArts } from '@/lib/admin/arts';
import { listImportSnapshots } from '@/lib/admin/imports';
import { listInitiatives } from '@/lib/admin/initiatives';
import { listPlanningCycles, listSprints } from '@/lib/admin/planningCycles';
import { listPlatforms } from '@/lib/admin/platforms';
import { listAllTeamCycleParticipation, listTeams } from '@/lib/admin/teams';
import { getCycleReadinessSummaries } from '@/lib/admin/readiness';

export async function getAdminBootstrapData() {
  const [planningCycles, sprints, platforms, arts, teams, teamParticipation, initiatives, imports, cycleReadiness] = await Promise.all([
    listPlanningCycles(),
    listSprints(),
    listPlatforms(),
    listArts(),
    listTeams(),
    listAllTeamCycleParticipation(),
    listInitiatives(),
    listImportSnapshots(),
    getCycleReadinessSummaries(),
  ]);

  return {
    planningCycles,
    sprints,
    platforms,
    arts,
    teams,
    teamParticipation,
    initiatives,
    imports,
    cycleReadiness,
  };
}
