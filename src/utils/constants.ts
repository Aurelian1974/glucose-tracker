import type { ReadingContext, GlucoseUnit } from '@/types';

export const CONTEXT_LABELS: Record<ReadingContext, string> = {
  fasting:     'À jeun',
  before_meal: 'Preprandial',
  after_meal:  'Postprandial',
  bedtime:     'Seara',
  random:      'Aleatoriu',
};

export const CONTEXT_SHORT_LABELS: Record<ReadingContext, string> = {
  fasting:     'À JEUN',
  before_meal: 'PREPRAND.',
  after_meal:  'POSTPRAND.',
  bedtime:     'SEARA',
  random:      'ALEATORIU',
};

export const CONTEXT_ICONS: Record<ReadingContext, string> = {
  fasting:     '🌅',
  before_meal: '🍽️',
  after_meal:  '✅',
  bedtime:     '🌙',
  random:      '⚡',
};

export const ALL_CONTEXTS: ReadingContext[] = [
  'fasting', 'before_meal', 'after_meal', 'bedtime', 'random',
];

export const DEFAULT_SETTINGS = {
  unit: 'mgdl' as GlucoseUnit,
  a1cTarget: 7.0,
  reminderEnabled: false,
  patientName: '',
};
/** 120 mg/dL ≈ 6.65 mmol/L */
export const DEFAULT_FASTING_LIMIT_MMOL = 6.65;
/** 160 mg/dL ≈ 8.88 mmol/L */
export const DEFAULT_POSTPRANDIAL_LIMIT_MMOL = 8.88;