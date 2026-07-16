import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import { getLocalDay } from '../../lib/date';
import { loadTodaySnapshot, saveDailyActivity } from '../today/today-log';
import type { ISODate } from '../../types/health';

export type WorkoutEntry = {
  workoutEntryId: string;
  logDate: ISODate;
  workoutType: string;
  exercise: string;
  sets: number;
  reps: number;
  weightUsed: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersistedWorkoutState = {
  entries: WorkoutEntry[];
};

const LOCAL_STORAGE_KEY = 'health-app.workout-log.v1';

function todayDate(): ISODate {
  return getLocalDay();
}

function nowIso() {
  return new Date().toISOString();
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadState(): PersistedWorkoutState {
  if (!canUseLocalStorage()) {
    return { entries: [] };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return { entries: [] };
    }

    const parsed = JSON.parse(raw) as PersistedWorkoutState;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { entries: [] };
  }
}

function saveState(state: PersistedWorkoutState) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
}

export function exportWorkoutBackupState(): PersistedWorkoutState {
  return loadState();
}

function sortEntries(entries: WorkoutEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.logDate === b.logDate) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.logDate.localeCompare(b.logDate);
  });
}

export function summarizeWorkoutEntries(entries: WorkoutEntry[]) {
  const totalSets = entries.reduce((sum, entry) => sum + entry.sets, 0);
  const totalVolume = entries.reduce((sum, entry) => sum + (entry.sets * entry.reps * entry.weightUsed), 0);
  const exerciseCount = new Set(entries.map((entry) => `${entry.workoutType}::${entry.exercise}`)).size;
  const latestExercise = entries.length ? entries[entries.length - 1]?.exercise ?? null : null;

  return {
    exerciseCount,
    totalSets,
    totalVolume: Number(totalVolume.toFixed(1)),
    latestExercise,
  };
}

export async function listWorkoutEntries() {
  return sortEntries(loadState().entries);
}

export async function loadWorkoutSnapshot(logDate: ISODate = todayDate()) {
  const repository = await getAppHealthRepository();
  await loadTodaySnapshot(logDate);
  const dailyLog = await repository.getDailyLog(logDate);
  const allEntries = sortEntries(loadState().entries);
  const entries = allEntries.filter((entry) => entry.logDate === logDate);

  return {
    logDate,
    entries,
    allEntries,
    steps: dailyLog?.steps ?? 0,
    miles: dailyLog?.walkMiles ?? 0,
    summary: summarizeWorkoutEntries(entries),
  };
}

export async function saveWorkoutEntry(params: {
  logDate?: ISODate;
  workoutType: string;
  exercise: string;
  sets: number;
  reps: number;
  weightUsed: number;
  notes?: string | null;
  steps?: number | null;
  miles?: number | null;
}) {
  const logDate = params.logDate ?? todayDate();
  const timestamp = nowIso();
  const state = loadState();

  state.entries.push({
    workoutEntryId: `workout-${logDate}-${timestamp}`,
    logDate,
    workoutType: params.workoutType,
    exercise: params.exercise,
    sets: params.sets,
    reps: params.reps,
    weightUsed: params.weightUsed,
    notes: params.notes?.trim() ? params.notes.trim() : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  saveState({ entries: sortEntries(state.entries) });

  if (params.steps != null || params.miles != null) {
    await saveDailyActivity({
      logDate,
      steps: params.steps ?? undefined,
      walkMiles: params.miles ?? undefined,
    });
  }

  return loadWorkoutSnapshot(logDate);
}
