'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Archive, ArchiveRestore, Check, GripVertical, Pencil, X } from 'lucide-react';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  createArtAction,
  createInitiativeAction,
  createPlatformAction,
  createTeamAction,
  archivePlanningCycleAction,
  markCycleActiveAction,
  reorderArtsAction,
  rollbackLatestImportAction,
  runImportAction,
  savePlanningCycleAction,
  setTeamParticipationAction,
  updateArtAction,
  updateInitiativeAction,
  updatePlatformAction,
  updatePlanningCycleAction,
  updatePlanningCycleWithSprintsAction,
  updateTeamAction,
} from '@/app/admin/actions';
import { Art, CsvMappedRow, CycleReadinessSummary, GeneratedSprintPreview, ImportSnapshot, Initiative, PlanningCycle, Platform, Sprint, Team, TeamCycleParticipation } from '@/lib/admin/types';
import { generateSprintPreview } from '@/lib/planning/sprintGeneration';
import { getLatestSprintNumber } from '@/lib/planning/sprintNumbering';
import { buildSprintNameSet, getCycleSprintNames, isSprintMappedToCycle } from '@/lib/planning/sprintMapping';

type TabKey = 'cycles' | 'platforms' | 'arts' | 'teams' | 'initiatives' | 'imports';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'cycles', label: 'Program Increments' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'arts', label: 'ARTs' },
  { key: 'teams', label: 'Teams' },
  { key: 'initiatives', label: 'Value Streams' },
  { key: 'imports', label: 'Import / Sync' },
];

const requiredFields = ['sourceSystem', 'art', 'initiative', 'team', 'platform', 'featureKey', 'featureTitle', 'storyKey', 'storyTitle', 'sprint', 'status'];
const optionalFields = ['commitmentStatus', 'dependencyType', 'dependsOnKey', 'dependencyOwner', 'dependencyCriticality', 'dependencyTargetSprint', 'dependencyDescription'];

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };

  const parseLine = (line: string) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function SortableArtRow({ art }: { art: Art }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: art.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-1 text-sm font-medium text-gray-800">{art.name}</span>
      {art.short_name && (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{art.short_name}</span>
      )}
      <span className={`rounded px-2 py-0.5 text-xs font-medium ${art.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {art.is_active ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}

export function AdminControlCentre(props: {
  planningCycles: PlanningCycle[];
  sprints: Sprint[];
  platforms: Platform[];
  arts: Art[];
  teams: Team[];
  teamParticipation: TeamCycleParticipation[];
  initiatives: Initiative[];
  imports: ImportSnapshot[];
  cycleReadiness: CycleReadinessSummary[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('cycles');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>('');

  const [cycleForm, setCycleForm] = useState({
    name: `FY${new Date().getFullYear()} Q1`,
    startDate: '',
    sprintCount: 6,
    sprintLengthDays: 14,
  });
  const [cyclePreview, setCyclePreview] = useState<GeneratedSprintPreview[]>([]);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [editPreviewFor, setEditPreviewFor] = useState<string | null>(null);

  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', startDate: '', sprintCount: 0, sprintLengthDays: 0 });
  const [editPreview, setEditPreview] = useState<GeneratedSprintPreview[]>([]);
  const [editPreviewConfirmed, setEditPreviewConfirmed] = useState(false);
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);

  const latestSprintNumber = useMemo(() => getLatestSprintNumber(props.sprints), [props.sprints]);

  const cycleImportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const snapshot of props.imports) {
      if (snapshot.status === 'imported') {
        counts[snapshot.planning_cycle_id] = (counts[snapshot.planning_cycle_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [props.imports]);

  const startEditCycle = (cycle: PlanningCycle) => {
    setEditingCycleId(cycle.id);
    setEditForm({
      name: cycle.name,
      startDate: cycle.start_date,
      sprintCount: cycle.sprint_count,
      sprintLengthDays: cycle.sprint_length_days,
    });
    setEditPreview([]);
    setEditPreviewConfirmed(false);
    setEditPreviewFor(null);
    // Clear any create preview
    setCyclePreview([]);
    setPreviewConfirmed(false);
  };

  const cancelEditCycle = () => {
    setEditingCycleId(null);
    setEditPreview([]);
    setEditPreviewConfirmed(false);
    setEditPreviewFor(null);
  };

  const [selectedTeamCycle, setSelectedTeamCycle] = useState(props.planningCycles[0]?.id ?? '');
  const [selectedInitiativeCycle, setSelectedInitiativeCycle] = useState(props.planningCycles[0]?.id ?? '');
  const [selectedImportCycle, setSelectedImportCycle] = useState(props.planningCycles.find((cycle) => cycle.is_active)?.id ?? props.planningCycles[0]?.id ?? '');
  const [selectedSummaryCycle, setSelectedSummaryCycle] = useState(props.planningCycles.find((cycle) => cycle.is_active)?.id ?? props.planningCycles[0]?.id ?? '');

  const selectedReadiness = useMemo(
    () => props.cycleReadiness.find((item) => item.cycleId === selectedSummaryCycle) ?? null,
    [props.cycleReadiness, selectedSummaryCycle],
  );

  const hasActiveCycle = useMemo(() => props.planningCycles.some((cycle) => cycle.is_active), [props.planningCycles]);

  const [newPlatformName, setNewPlatformName] = useState('');
  const [newArtName, setNewArtName] = useState('');
  const [artOrder, setArtOrder] = useState<Art[]>(props.arts);
  useEffect(() => { setArtOrder(props.arts); }, [props.arts]);
  const artSensors = useSensors(useSensor(PointerSensor));
  const [newTeam, setNewTeam] = useState({ name: '', platform_id: '' });
  const [newInitiative, setNewInitiative] = useState({ name: '', art_id: '' });

  const [csvState, setCsvState] = useState({
    fileName: '',
    headers: [] as string[],
    rows: [] as string[][],
    mappings: {} as Record<string, string>,
  });

  const participatingLookup = useMemo(() => {
    const key = `${selectedTeamCycle}`;
    return new Set(
      props.teamParticipation
        .filter((row) => row.planning_cycle_id === key && row.is_participating)
        .map((row) => row.team_id),
    );
  }, [props.teamParticipation, selectedTeamCycle]);

  const activeCycleSprints = useMemo(() => getCycleSprintNames(props.sprints, selectedImportCycle), [props.sprints, selectedImportCycle]);
  const activeCycleSprintSet = useMemo(() => buildSprintNameSet(activeCycleSprints), [activeCycleSprints]);

  const mappedRows: CsvMappedRow[] = useMemo(() => {
    if (!csvState.headers.length || !csvState.rows.length) return [];
    return csvState.rows.map((row) => {
      const record: CsvMappedRow = {};
      [...requiredFields, ...optionalFields].forEach((field) => {
        const header = csvState.mappings[field];
        if (!header) return;
        const idx = csvState.headers.indexOf(header);
        record[field] = idx >= 0 ? row[idx] ?? '' : '';
      });
      return record;
    });
  }, [csvState]);

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    requiredFields.forEach((field) => {
      if (!csvState.mappings[field]) errors.push(`Required mapping missing: ${field}`);
    });

    const seenStories = new Set<string>();
    let validRows = 0;

    mappedRows.forEach((row, index) => {
      const rowLabel = `Row ${index + 1}`;
      if (!row.sprint) {
        errors.push(`${rowLabel}: sprint is required`);
        return;
      }
      if (!isSprintMappedToCycle(row.sprint, activeCycleSprintSet)) {
        warnings.push(`${rowLabel}: unknown sprint '${row.sprint}' for the selected Program Increment`);
      }
      if (!row.storyKey) {
        errors.push(`${rowLabel}: storyKey is missing`);
        return;
      }
      if (seenStories.has(row.storyKey)) {
        warnings.push(`${rowLabel}: duplicate storyKey '${row.storyKey}'`);
      }
      seenStories.add(row.storyKey);
      validRows += 1;
    });

    return {
      errors,
      warnings,
      validRows,
      totalRows: mappedRows.length,
      validMappedRows: mappedRows.filter((row) => row.storyKey && row.sprint),
    };
  }, [csvState.mappings, mappedRows, activeCycleSprintSet]);

  const submit = (work: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await work();
      setMessage(result.ok ? success : result.error ?? 'Action failed');
    });
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded border p-4"
        style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', borderBottomWidth: 1 }}
      >
        <h2 className="text-2xl font-bold text-gray-900">Dispatch Admin Control Centre</h2>
        <p className="text-sm text-gray-600 mt-1">Configure Program Increments, teams, initiatives and import planning data</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-3 py-1 text-sm ${activeTab === tab.key ? 'border-royalRed bg-royalRed text-white' : 'border-gray-300 bg-white text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm">{message}</div>}

      <section className="rounded border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">PI Readiness & Import Health</h3>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedSummaryCycle}
            onChange={(e) => setSelectedSummaryCycle(e.target.value)}
          >
            {props.planningCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedReadiness ? (
          <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            No active Program Increment configured or readiness data available.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-gray-600">Active Program Increment</p>
                <p className="font-semibold text-gray-900">{selectedReadiness.cycleName}</p>
                <p className="text-xs text-gray-600">{selectedReadiness.cycleStartDate} → {selectedReadiness.cycleEndDate}</p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Configured sprints</p>
                <p className="text-xl font-semibold">{selectedReadiness.configuredSprintCount}</p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Participating teams</p>
                <p className="text-xl font-semibold">
                  {selectedReadiness.participatingTeamsCount} / {selectedReadiness.totalActiveTeamsCount}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Active initiatives</p>
                <p className="text-xl font-semibold">{selectedReadiness.activeInitiativesCount}</p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Import count</p>
                <p className="text-xl font-semibold">{selectedReadiness.importCount}</p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Data freshness</p>
                <p className="text-sm font-semibold">{selectedReadiness.freshnessSummary}</p>
              </div>
              <div className="rounded border border-gray-200 bg-white p-3">
                <p className="text-xs text-gray-600">Overall readiness</p>
                <p className={`text-sm font-semibold ${selectedReadiness.readinessStatus === 'Ready' ? 'text-green-700' : selectedReadiness.readinessStatus === 'At Risk' ? 'text-amber-700' : 'text-royalRed'}`}>
                  {selectedReadiness.readinessStatus}
                </p>
              </div>
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 p-3">
              <h4 className="font-semibold text-sm mb-2">Attention Items</h4>
              <ul className="space-y-1 text-sm">
                {!hasActiveCycle && <li className="text-royalRed">• No active Program Increment configured.</li>}
                {selectedReadiness.attentionItems.map((item) => (
                  <li key={item} className="text-royalRed">
                    • {item}
                  </li>
                ))}
                {hasActiveCycle && selectedReadiness.attentionItems.length === 0 && (
                  <li className="text-green-700">• No immediate attention items for this Program Increment.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </section>

      {activeTab === 'cycles' && (
        <div className="rounded border p-4 space-y-4">
          <h3 className="font-semibold">Program Increments</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <colgroup>
                <col className="w-1/4" />{/* Name ~25% */}
                <col className="w-1/6" />{/* Start ~17% */}
                <col className="w-1/6" />{/* End ~17% */}
                <col className="w-1/12" />{/* Sprints ~8% */}
                <col className="w-1/12" />{/* Length (days) ~8% */}
                <col className="w-1/12" />{/* Active ~8% */}
                <col className="w-1/6" />{/* Actions ~17% */}
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Start</th>
                  <th className="p-2 text-left">End</th>
                  <th className="p-2 text-left">Sprints</th>
                  <th className="p-2 text-left">Length (days)</th>
                  <th className="p-2 text-left">Active</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {props.planningCycles.map((cycle) => {
                  const isEditing = editingCycleId === cycle.id;
                  const hasImports = (cycleImportCounts[cycle.id] ?? 0) > 0;
                  const sprintConfigChanged = isEditing && (
                    editForm.startDate !== cycle.start_date ||
                    editForm.sprintCount !== cycle.sprint_count ||
                    editForm.sprintLengthDays !== cycle.sprint_length_days
                  );

                  if (isEditing) {
                    return (
                      <tr key={cycle.id} className="border-t bg-gray-50">
                        <td className="p-2">
                          <input className="border rounded px-2 py-1.5 w-full text-sm" value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
                        </td>
                        <td className="p-2">
                          <div className="relative group">
                            <input
                              className="border rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                              type="date"
                              value={editForm.startDate}
                              disabled={hasImports}
                              onChange={(e) => { setEditForm((prev) => ({ ...prev, startDate: e.target.value })); setEditPreview([]); setEditPreviewConfirmed(false); setEditPreviewFor(null); }}
                            />
                            {hasImports && <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">Cannot change start date after data has been imported</div>}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="rounded border border-dashed border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-400 whitespace-nowrap">
                            {editForm.startDate ? (() => {
                              const [y, m, d] = editForm.startDate.split('-').map(Number);
                              const end = new Date(y, m - 1, d + editForm.sprintCount * editForm.sprintLengthDays);
                              return end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            })() : '—'}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="relative group">
                            <input
                              className="border rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                              type="number"
                              min={1}
                              value={editForm.sprintCount}
                              disabled={hasImports}
                              onChange={(e) => { setEditForm((prev) => ({ ...prev, sprintCount: Number(e.target.value) })); setEditPreview([]); setEditPreviewConfirmed(false); setEditPreviewFor(null); }}
                            />
                            {hasImports && <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">Cannot change sprint count after data has been imported</div>}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="relative group">
                            <input
                              className="border rounded px-2 py-1.5 w-full text-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                              type="number"
                              min={1}
                              value={editForm.sprintLengthDays}
                              disabled={hasImports}
                              onChange={(e) => { setEditForm((prev) => ({ ...prev, sprintLengthDays: Number(e.target.value) })); setEditPreview([]); setEditPreviewConfirmed(false); setEditPreviewFor(null); }}
                            />
                            {hasImports && <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">Cannot change sprint length after data has been imported</div>}
                          </div>
                        </td>
                        <td className="p-2">{cycle.is_active ? 'Yes' : 'No'}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {sprintConfigChanged ? (
                              <button
                                className="rounded bg-royalRed text-white px-2 py-1 text-xs whitespace-nowrap"
                                onClick={() => {
                                  const cycleSprints = props.sprints.filter((s) => s.planning_cycle_id === cycle.id);
                                  const otherSprints = props.sprints.filter((s) => s.planning_cycle_id !== cycle.id);
                                  const baseSprintNumber = otherSprints.reduce((max, s) => Math.max(max, s.sprint_number), 0);
                                  const preview = generateSprintPreview({
                                    startDate: editForm.startDate,
                                    sprintCount: editForm.sprintCount,
                                    sprintLengthDays: editForm.sprintLengthDays,
                                    latestSprintNumber: baseSprintNumber,
                                  });
                                  setEditPreview(preview);
                                  setEditPreviewConfirmed(false);
                                  setEditPreviewFor(cycle.id);
                                }}
                              >
                                Preview
                              </button>
                            ) : (
                              <button
                                className="rounded bg-royalRed text-white p-1 text-xs"
                                title="Save"
                                onClick={() => {
                                  submit(
                                    () => updatePlanningCycleAction(cycle.id, { name: editForm.name }),
                                    'Program Increment updated',
                                  );
                                  cancelEditCycle();
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              className="rounded bg-gray-700 text-white p-1 text-xs"
                              title="Cancel"
                              onClick={cancelEditCycle}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={cycle.id} className={`border-t transition-colors ${cycle.is_archived ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                      <td className={`p-2 whitespace-nowrap ${cycle.is_archived ? 'line-through text-gray-400' : ''}`}>{cycle.name}</td>
                      <td className="p-2 whitespace-nowrap">{cycle.start_date}</td>
                      <td className="p-2 whitespace-nowrap">{cycle.end_date}</td>
                      <td className="p-2">{cycle.sprint_count}</td>
                      <td className="p-2">{cycle.sprint_length_days}</td>
                      <td className="p-2">{cycle.is_active ? 'Yes' : 'No'}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded bg-gray-200 text-gray-700 p-1 text-xs hover:bg-gray-300 transition-colors"
                            title="Edit"
                            onClick={() => startEditCycle(cycle)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {cycle.is_archived ? (
                            <button
                              className="rounded bg-gray-200 text-gray-700 p-1 text-xs hover:bg-gray-300 transition-colors"
                              title="Unarchive"
                              onClick={() => submit(() => archivePlanningCycleAction(cycle.id, false), 'Program Increment unarchived')}
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <div className="relative group">
                              <button
                                className={`rounded bg-gray-200 text-gray-700 p-1 text-xs transition-colors ${cycle.is_active ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-gray-300'}`}
                                title={cycle.is_active ? 'Deactivate this PI before archiving' : 'Archive'}
                                onClick={() => setArchiveConfirmId(cycle.id)}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              {cycle.is_active && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                  Deactivate this PI before archiving
                                </div>
                              )}
                            </div>
                          )}
                          <button className="text-xs rounded bg-royalRed text-white px-2 py-1" onClick={() => submit(() => markCycleActiveAction(cycle.id), 'Program Increment activated')}>Set active</button>
                          <button className="text-xs rounded bg-gray-700 text-white px-2 py-1" onClick={() => submit(() => updatePlanningCycleAction(cycle.id, { is_active: false }), 'Program Increment deactivated')}>Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-200 bg-gray-50">
                  <td className="p-2">
                    <input className="border rounded px-2 py-1.5 w-full text-sm" placeholder="e.g. FY26 Q1" value={cycleForm.name} onChange={(e) => setCycleForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </td>
                  <td className="p-2">
                    <input className="border rounded px-2 py-1.5 w-full text-sm" type="date" value={cycleForm.startDate} onChange={(e) => setCycleForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                  </td>
                  <td className="p-2">
                    <div className="rounded border border-dashed border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-400 whitespace-nowrap">
                      {cycleForm.startDate ? (() => {
                        const [y, m, d] = cycleForm.startDate.split('-').map(Number);
                        const end = new Date(y, m - 1, d + cycleForm.sprintCount * cycleForm.sprintLengthDays);
                        return end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      })() : '—'}
                    </div>
                  </td>
                  <td className="p-2">
                    <input className="border rounded px-2 py-1.5 w-full text-sm" type="number" min={1} value={cycleForm.sprintCount} onChange={(e) => setCycleForm((prev) => ({ ...prev, sprintCount: Number(e.target.value) }))} />
                  </td>
                  <td className="p-2">
                    <input className="border rounded px-2 py-1.5 w-full text-sm" type="number" min={1} value={cycleForm.sprintLengthDays} onChange={(e) => setCycleForm((prev) => ({ ...prev, sprintLengthDays: Number(e.target.value) }))} />
                  </td>
                  <td className="p-2 text-gray-400">—</td>
                  <td className="p-2">
                    <button
                      className="rounded bg-royalRed text-white px-2 py-1 text-xs whitespace-nowrap"
                      onClick={() => {
                        const preview = generateSprintPreview({
                          startDate: cycleForm.startDate,
                          sprintCount: cycleForm.sprintCount,
                          sprintLengthDays: cycleForm.sprintLengthDays,
                          latestSprintNumber,
                        });
                        setCyclePreview(preview);
                        setPreviewConfirmed(false);
                      }}
                    >
                      Generate Preview
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Edit sprint preview — shown when sprint config changed on an existing PI */}
          {editPreviewFor && editPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Sprint Preview — editing {props.planningCycles.find((c) => c.id === editPreviewFor)?.name}</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded">
                  <thead className="bg-gray-100"><tr><th className="p-2 text-left">Sprint</th><th className="p-2 text-left">Start Date</th><th className="p-2 text-left">End Date</th></tr></thead>
                  <tbody>
                    {editPreview.map((sprint, idx) => (
                      <tr className="border-t" key={sprint.sprint_number}>
                        <td className="p-2"><input className="border-b border-gray-300 bg-transparent px-1 py-0.5 w-full focus:outline-none focus:border-royalRed" value={sprint.name} onChange={(e) => setEditPreview((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} /></td>
                        <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={sprint.start_date} onChange={(e) => setEditPreview((prev) => prev.map((item, i) => (i === idx ? { ...item, start_date: e.target.value } : item)))} /></td>
                        <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={sprint.end_date} onChange={(e) => setEditPreview((prev) => prev.map((item, i) => (i === idx ? { ...item, end_date: e.target.value } : item)))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={editPreviewConfirmed} onChange={(e) => setEditPreviewConfirmed(e.target.checked)} /> I confirm this sprint preview</label>
              <div className="flex gap-2">
                <button
                  className="rounded bg-royalRed text-white px-3 py-1.5 text-sm disabled:opacity-50"
                  disabled={!editPreviewConfirmed}
                  onClick={() => {
                    const endDate = editPreview[editPreview.length - 1]?.end_date ?? editForm.startDate;
                    submit(
                      () =>
                        updatePlanningCycleWithSprintsAction({
                          id: editPreviewFor,
                          cycle: {
                            name: editForm.name,
                            start_date: editForm.startDate,
                            end_date: endDate,
                            sprint_count: editForm.sprintCount,
                            sprint_length_days: editForm.sprintLengthDays,
                          },
                          sprints: editPreview,
                        }),
                      'Program Increment updated',
                    );
                    cancelEditCycle();
                  }}
                >
                  Save Program Increment
                </button>
                <button
                  className="rounded bg-gray-700 text-white px-3 py-1.5 text-sm"
                  onClick={cancelEditCycle}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Create sprint preview — shown when creating a new PI */}
          {!!cyclePreview.length && (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded">
                  <thead className="bg-gray-100"><tr><th className="p-2 text-left">Sprint</th><th className="p-2 text-left">Start Date</th><th className="p-2 text-left">End Date</th></tr></thead>
                  <tbody>
                    {cyclePreview.map((sprint, idx) => (
                      <tr className="border-t" key={sprint.sprint_number}>
                        <td className="p-2"><input className="border-b border-gray-300 bg-transparent px-1 py-0.5 w-full focus:outline-none focus:border-royalRed" value={sprint.name} onChange={(e) => setCyclePreview((prev) => prev.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))} /></td>
                        <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={sprint.start_date} onChange={(e) => setCyclePreview((prev) => prev.map((item, i) => (i === idx ? { ...item, start_date: e.target.value } : item)))} /></td>
                        <td className="p-2"><input type="date" className="border rounded px-2 py-1" value={sprint.end_date} onChange={(e) => setCyclePreview((prev) => prev.map((item, i) => (i === idx ? { ...item, end_date: e.target.value } : item)))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={previewConfirmed} onChange={(e) => setPreviewConfirmed(e.target.checked)} /> I confirm this sprint preview</label>
              <button
                className="rounded bg-royalRed text-white px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={!previewConfirmed || !cyclePreview.length}
                onClick={() => {
                  const endDate = cyclePreview[cyclePreview.length - 1]?.end_date ?? cycleForm.startDate;
                  submit(
                    () =>
                      savePlanningCycleAction({
                        cycle: {
                          name: cycleForm.name,
                          start_date: cycleForm.startDate,
                          end_date: endDate,
                          sprint_count: cycleForm.sprintCount,
                          sprint_length_days: cycleForm.sprintLengthDays,
                          is_active: props.planningCycles.length === 0,
                        },
                        sprints: cyclePreview,
                      }),
                    'Program Increment created',
                  );
                }}
              >
                Save Program Increment
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="rounded border p-4 space-y-3">
          <h3 className="font-semibold">Platforms</h3>
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1" placeholder="Add platform" value={newPlatformName} onChange={(e) => setNewPlatformName(e.target.value)} />
            <button className="rounded bg-royalRed px-3 py-1 text-white text-sm" onClick={() => submit(() => createPlatformAction(newPlatformName), 'Platform added')}>Add</button>
          </div>
          <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Status</th></tr></thead><tbody>
            {props.platforms.map((platform) => (
              <tr key={platform.id} className="border-t">
                <td className="p-2"><input className="border rounded px-2 py-1 w-full" defaultValue={platform.name} onBlur={(e) => submit(() => updatePlatformAction(platform.id, { name: e.target.value }), 'Platform updated')} /></td>
                <td className="p-2"><button className="text-xs rounded bg-gray-700 text-white px-2 py-1" onClick={() => submit(() => updatePlatformAction(platform.id, { is_active: !platform.is_active }), 'Platform status updated')}>{platform.is_active ? 'Active' : 'Inactive'}</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}

      {activeTab === 'arts' && (
        <div className="rounded border p-4 space-y-3">
          <h3 className="font-semibold">ARTs</h3>
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1" placeholder="Add ART" value={newArtName} onChange={(e) => setNewArtName(e.target.value)} />
            <button className="rounded bg-royalRed px-3 py-1 text-white text-sm" onClick={() => submit(() => createArtAction(newArtName), 'ART added')}>Add</button>
          </div>
          <p className="text-xs text-gray-400">Drag to reorder — determines ART order in the planning header</p>
          <DndContext
            sensors={artSensors}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = artOrder.findIndex((a) => a.id === active.id);
              const newIndex = artOrder.findIndex((a) => a.id === over.id);
              const reordered = arrayMove(artOrder, oldIndex, newIndex);
              setArtOrder(reordered);
              void reorderArtsAction(reordered.map((a) => a.id));
            }}
          >
            <SortableContext items={artOrder.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {artOrder.map((art) => (
                  <SortableArtRow key={art.id} art={art} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="rounded border p-4 space-y-3">
          <h3 className="font-semibold">Teams</h3>
          <div className="grid md:grid-cols-3 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Team name" value={newTeam.name} onChange={(e) => setNewTeam((prev) => ({ ...prev, name: e.target.value }))} />
            <select className="border rounded px-2 py-1" value={newTeam.platform_id} onChange={(e) => setNewTeam((prev) => ({ ...prev, platform_id: e.target.value }))}>
              <option value="">Select platform</option>
              {props.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}
            </select>
            <button className="rounded bg-royalRed px-3 py-1 text-white text-sm" onClick={() => submit(() => createTeamAction({ name: newTeam.name, platform_id: newTeam.platform_id || null }), 'Team added')}>Add Team</button>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <label>Program Increment:</label>
            <select className="border rounded px-2 py-1" value={selectedTeamCycle} onChange={(e) => setSelectedTeamCycle(e.target.value)}>
              {props.planningCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </select>
          </div>

          <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Platform</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Participating</th></tr></thead><tbody>
            {props.teams.map((team) => (
              <tr key={team.id} className="border-t">
                <td className="p-2"><input className="border rounded px-2 py-1 w-full" defaultValue={team.name} onBlur={(e) => submit(() => updateTeamAction(team.id, { name: e.target.value }), 'Team updated')} /></td>
                <td className="p-2"><select className="border rounded px-2 py-1" value={team.platform_id ?? ''} onChange={(e) => submit(() => updateTeamAction(team.id, { platform_id: e.target.value || null }), 'Team platform updated')}><option value="">Unassigned</option>{props.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></td>
                <td className="p-2"><button className="text-xs rounded bg-gray-700 text-white px-2 py-1" onClick={() => submit(() => updateTeamAction(team.id, { is_active: !team.is_active }), 'Team status updated')}>{team.is_active ? 'Active' : 'Inactive'}</button></td>
                <td className="p-2"><input type="checkbox" checked={participatingLookup.has(team.id)} onChange={(e) => submit(() => setTeamParticipationAction({ planning_cycle_id: selectedTeamCycle, team_id: team.id, is_participating: e.target.checked }), 'Participation updated')} /></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}

      {activeTab === 'initiatives' && (
        <div className="rounded border p-4 space-y-3">
          <h3 className="font-semibold">Initiatives</h3>
          <div className="grid md:grid-cols-4 gap-2">
            <select className="border rounded px-2 py-1" value={selectedInitiativeCycle} onChange={(e) => setSelectedInitiativeCycle(e.target.value)}>
              {props.planningCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </select>
            <input className="border rounded px-2 py-1" placeholder="Initiative name" value={newInitiative.name} onChange={(e) => setNewInitiative((prev) => ({ ...prev, name: e.target.value }))} />
            <select className="border rounded px-2 py-1" value={newInitiative.art_id} onChange={(e) => setNewInitiative((prev) => ({ ...prev, art_id: e.target.value }))}>
              <option value="">Select ART</option>
              {props.arts.map((art) => <option key={art.id} value={art.id}>{art.name}</option>)}
            </select>
            <button className="rounded bg-royalRed px-3 py-1 text-white text-sm" onClick={() => submit(() => createInitiativeAction({ name: newInitiative.name, art_id: newInitiative.art_id || null, planning_cycle_id: selectedInitiativeCycle, is_active: true }), 'Initiative created')}>Add Initiative</button>
          </div>

          <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">ART</th><th className="p-2 text-left">PI</th><th className="p-2 text-left">Status</th></tr></thead><tbody>
            {props.initiatives.filter((initiative) => initiative.planning_cycle_id === selectedInitiativeCycle).map((initiative) => (
              <tr key={initiative.id} className="border-t">
                <td className="p-2"><input className="border rounded px-2 py-1 w-full" defaultValue={initiative.name} onBlur={(e) => submit(() => updateInitiativeAction(initiative.id, { name: e.target.value }), 'Initiative updated')} /></td>
                <td className="p-2"><select className="border rounded px-2 py-1" value={initiative.art_id ?? ''} onChange={(e) => submit(() => updateInitiativeAction(initiative.id, { art_id: e.target.value || null }), 'Initiative ART updated')}><option value="">Unassigned</option>{props.arts.map((art) => <option key={art.id} value={art.id}>{art.name}</option>)}</select></td>
                <td className="p-2">{props.planningCycles.find((cycle) => cycle.id === initiative.planning_cycle_id)?.name ?? '-'}</td>
                <td className="p-2"><button className="text-xs rounded bg-gray-700 text-white px-2 py-1" onClick={() => submit(() => updateInitiativeAction(initiative.id, { is_active: !initiative.is_active }), 'Initiative status updated')}>{initiative.is_active ? 'Active' : 'Inactive'}</button></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      )}

      {activeTab === 'imports' && (
        <div className="space-y-4">
          <div className="rounded border p-4 space-y-3">
            <h3 className="font-semibold">A. Upload</h3>
            <p className="text-sm text-gray-600">Upload a planning snapshot CSV containing one or more teams’ planning data for the current PI.</p>
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1" value={selectedImportCycle} onChange={(e) => setSelectedImportCycle(e.target.value)}>
                {props.planningCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
              </select>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const parsed = parseCsv(text);
                  const initialMappings: Record<string, string> = {};
                  [...requiredFields, ...optionalFields].forEach((field) => {
                    const guess = parsed.headers.find((header) => header.toLowerCase() === field.toLowerCase());
                    if (guess) initialMappings[field] = guess;
                  });
                  setCsvState({ fileName: file.name, headers: parsed.headers, rows: parsed.rows, mappings: initialMappings });
                }}
              />
            </div>
          </div>

          {!!csvState.headers.length && (
            <div className="rounded border p-4 space-y-3">
              <h3 className="font-semibold">B. Preview / Column Mapping</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {[...requiredFields, ...optionalFields].map((field) => (
                  <label key={field} className="text-sm flex items-center justify-between gap-2 border rounded p-2">
                    <span className={requiredFields.includes(field) ? 'font-semibold' : ''}>{field}</span>
                    <select className="border rounded px-2 py-1" value={csvState.mappings[field] ?? ''} onChange={(e) => setCsvState((prev) => ({ ...prev, mappings: { ...prev.mappings, [field]: e.target.value } }))}>
                      <option value="">Unmapped</option>
                      {csvState.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-100"><tr>{csvState.headers.map((header) => <th key={header} className="p-2 text-left">{header}</th>)}</tr></thead>
                  <tbody>
                    {csvState.rows.slice(0, 10).map((row, idx) => <tr key={idx} className="border-t">{csvState.headers.map((_, i) => <td key={i} className="p-2">{row[i]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!!csvState.headers.length && (
            <div className="rounded border p-4 space-y-3">
              <h3 className="font-semibold">C. Validation Summary</h3>
              <div className="text-sm">Valid rows: {validation.validRows} / {validation.totalRows}</div>
              {!!validation.errors.length && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{validation.errors.slice(0, 8).map((error) => <p key={error}>• {error}</p>)}</div>}
              {!!validation.warnings.length && <div className="rounded border border-yellow-200 bg-yellow-50 p-2 text-sm text-yellow-700">{validation.warnings.slice(0, 8).map((warning) => <p key={warning}>• {warning}</p>)}</div>}
              <div className="flex gap-2">
                <button className="rounded bg-gray-700 text-white px-3 py-1 text-sm" onClick={() => setCsvState((prev) => ({ ...prev, headers: [], rows: [], mappings: {}, fileName: '' }))}>Cancel</button>
                <button
                  className="rounded bg-royalRed text-white px-3 py-1 text-sm disabled:opacity-50"
                  disabled={validation.errors.length > 0 || validation.validMappedRows.length === 0 || !selectedImportCycle}
                  onClick={() =>
                    submit(
                      () =>
                        runImportAction({
                          planningCycleId: selectedImportCycle,
                          fileName: csvState.fileName,
                          validRows: validation.validMappedRows,
                          warningCount: validation.warnings.length,
                          totalRows: validation.totalRows,
                          mode: 'valid-only',
                        }),
                      'Imported valid rows',
                    )
                  }
                >
                  Import valid rows only
                </button>
                <button
                  className="rounded bg-royalRed text-white px-3 py-1 text-sm disabled:opacity-50"
                  disabled={validation.errors.length > 0 || !selectedImportCycle}
                  onClick={() =>
                    submit(
                      () =>
                        runImportAction({
                          planningCycleId: selectedImportCycle,
                          fileName: csvState.fileName,
                          validRows: mappedRows,
                          warningCount: validation.warnings.length,
                          totalRows: validation.totalRows,
                          mode: 'continue',
                        }),
                      'Import completed',
                    )
                  }
                >
                  Continue anyway
                </button>
              </div>
            </div>
          )}

          <div className="rounded border p-4 space-y-3">
            <h3 className="font-semibold">D. Import History</h3>
            <table className="min-w-full text-sm"><thead className="bg-gray-100"><tr><th className="p-2 text-left">Imported At</th><th className="p-2 text-left">File</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">Rows</th><th className="p-2 text-left">Status</th></tr></thead><tbody>
              {props.imports.filter((snapshot) => !selectedImportCycle || snapshot.planning_cycle_id === selectedImportCycle).map((snapshot) => (
                <tr key={snapshot.id} className="border-t">
                  <td className="p-2">{new Date(snapshot.imported_at).toLocaleString()}</td>
                  <td className="p-2">{snapshot.file_name}</td>
                  <td className="p-2">{snapshot.source_system}</td>
                  <td className="p-2">{snapshot.row_count}</td>
                  <td className="p-2">{snapshot.status}</td>
                </tr>
              ))}
            </tbody></table>
          </div>

          <div className="rounded border p-4 space-y-2">
            <h3 className="font-semibold">E. Rollback latest import</h3>
            <button
              className="rounded bg-gray-900 text-white px-3 py-1 text-sm disabled:opacity-50"
              disabled={!selectedImportCycle || pending}
              onClick={() => submit(() => rollbackLatestImportAction(selectedImportCycle), 'Latest import rolled back and live tables rebuilt')}
            >
              Rollback Latest Import
            </button>
          </div>
        </div>
      )}

      {/* Archive confirmation dialog */}
      {archiveConfirmId && (() => {
        const cycle = props.planningCycles.find((c) => c.id === archiveConfirmId);
        if (!cycle) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded border border-gray-200 shadow-lg p-6 max-w-sm w-full mx-4">
              <h4 className="font-semibold text-gray-900 mb-2">Archive {cycle.name}?</h4>
              <p className="text-sm text-gray-600 mb-4">
                This hides the Program Increment from cycle pickers across the app. No data is deleted. You can unarchive it at any time.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  className="rounded bg-royalRed text-white px-3 py-1.5 text-sm hover:opacity-90 transition-opacity"
                  onClick={() => {
                    submit(() => archivePlanningCycleAction(archiveConfirmId, true), 'Program Increment archived');
                    setArchiveConfirmId(null);
                  }}
                >
                  Archive
                </button>
                <button
                  className="rounded bg-gray-200 text-gray-700 px-3 py-1.5 text-sm hover:bg-gray-300 transition-colors"
                  onClick={() => setArchiveConfirmId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
