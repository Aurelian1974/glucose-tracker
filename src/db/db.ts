import Dexie, { type Table } from 'dexie';
import type { GlucoseReading, AppSettings } from '@/types';
import { DEFAULT_TARGETS } from '@/utils/glucoseUtils';
import { DEFAULT_SETTINGS, DEFAULT_FASTING_LIMIT_MMOL, DEFAULT_POSTPRANDIAL_LIMIT_MMOL } from '@/utils/constants';

export class GlucoseDB extends Dexie {
  readings!: Table<GlucoseReading>;
  settings!: Table<AppSettings>;

  constructor() {
    super('GlucoseTrackerDB');
    this.version(1).stores({
      readings: '++id, timestamp, context',
      settings: '++id',
    });
    // v2: add fastingLimit + postprandialLimit to existing settings
    this.version(2).stores({
      readings: '++id, timestamp, context',
      settings: '++id',
    }).upgrade(tx => {
      return tx.table('settings').toCollection().modify(s => {
        if (s.fastingLimit == null)      s.fastingLimit      = DEFAULT_FASTING_LIMIT_MMOL;
        if (s.postprandialLimit == null) s.postprandialLimit = DEFAULT_POSTPRANDIAL_LIMIT_MMOL;
      });
    });
  }
}

export const db = new GlucoseDB();

export async function initializeDB(): Promise<void> {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      ...DEFAULT_SETTINGS,
      targets: DEFAULT_TARGETS,
      fastingLimit:      DEFAULT_FASTING_LIMIT_MMOL,
      postprandialLimit: DEFAULT_POSTPRANDIAL_LIMIT_MMOL,
    });
  }
}
