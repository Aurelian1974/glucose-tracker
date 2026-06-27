import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AppSettings } from '@/types';
import { DEFAULT_TARGETS } from '@/utils/glucoseUtils';
import { DEFAULT_SETTINGS, DEFAULT_FASTING_LIMIT_MMOL, DEFAULT_POSTPRANDIAL_LIMIT_MMOL } from '@/utils/constants';

const FALLBACK_SETTINGS: AppSettings = {
  id: 1,
  targets: DEFAULT_TARGETS,
  fastingLimit: DEFAULT_FASTING_LIMIT_MMOL,
  postprandialLimit: DEFAULT_POSTPRANDIAL_LIMIT_MMOL,
  ...DEFAULT_SETTINGS,
};

export function useSettings(): AppSettings {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  return settings ?? FALLBACK_SETTINGS;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const existing = await db.settings.toCollection().first();
  if (existing?.id != null) {
    await db.settings.update(existing.id, patch);
  }
}
