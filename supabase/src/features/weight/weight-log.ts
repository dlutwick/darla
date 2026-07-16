import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import { getLocalDay } from '../../lib/date';
import type { ISODate, WeightEntry } from '../../types/health';

function todayDate(): ISODate {
  return getLocalDay();
}

function nowIso() {
  return new Date().toISOString();
}

export async function loadWeightSnapshot(logDate: ISODate = todayDate()) {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const weightEntry = await repository.getWeightEntryByDate(logDate);
  const allWeights = await repository.listWeightEntries();
  const latestWeight = allWeights[allWeights.length - 1] ?? null;

  return {
    logDate,
    profile,
    weightEntry,
    latestWeight,
    allWeights,
  };
}

export async function saveWeight(params: { logDate?: ISODate; weightLb: number; notes?: string | null }) {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const userId = profile?.userId ?? 'darla';
  const logDate = params.logDate ?? todayDate();
  const existing = await repository.getWeightEntryByDate(logDate);
  const timestamp = nowIso();

  const entry: WeightEntry = {
    weightEntryId: existing?.weightEntryId ?? `weight-${logDate}`,
    userId,
    logDate,
    weightLb: params.weightLb,
    notes: params.notes ?? existing?.notes ?? null,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  await repository.upsertWeightEntry(entry);
  return loadWeightSnapshot(logDate);
}
