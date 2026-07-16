import { getAppHealthRepository } from '../../data/repositories/app-health-repository';
import { getLocalDay } from '../../lib/date';

export async function saveWalkMiles(walkMiles: number, logDate: string = getLocalDay()) {
  const repository = await getAppHealthRepository();
  const profile = await repository.getUserProfile();
  const userId = profile?.userId ?? 'darla';
  const timestamp = new Date().toISOString();
  const existing = await repository.getDailyLog(logDate);

  const log = existing ?? {
    logId: `daily-${logDate}`,
    userId,
    logDate,
    weightLb: null,
    waterL: null,
    walkMiles: null,
    exerciseMinutes: null,
    steps: null,
    sleepHours: null,
    notes: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await repository.upsertDailyLog({
    ...log,
    walkMiles,
    updatedAt: timestamp,
  });
}
