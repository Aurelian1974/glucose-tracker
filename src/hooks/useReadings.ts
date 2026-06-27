import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { GlucoseReading } from '@/types';

export function useReadings(days?: number): GlucoseReading[] | undefined {
  return useLiveQuery(async () => {
    if (days === undefined) {
      return db.readings.orderBy('timestamp').reverse().toArray();
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.readings
      .where('timestamp').aboveOrEqual(since)
      .reverse()
      .sortBy('timestamp');
  }, [days]);
}

export function useLastReading(): GlucoseReading | undefined {
  return useLiveQuery(() => db.readings.orderBy('timestamp').last());
}

export async function addReading(reading: Omit<GlucoseReading, 'id'>): Promise<number> {
  return db.readings.add(reading);
}

export async function deleteReading(id: number): Promise<void> {
  return db.readings.delete(id);
}

export async function deleteAllReadings(): Promise<void> {
  return db.readings.clear();
}
