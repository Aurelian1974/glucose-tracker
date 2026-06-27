// src/types/index.ts

export type GlucoseUnit = 'mmol' | 'mgdl';

export type ReadingContext =
  | 'fasting'
  | 'before_meal'
  | 'after_meal'
  | 'bedtime'
  | 'random';

export interface GlucoseReading {
  id?: number;
  value: number;       // always stored in mmol/L
  context: ReadingContext;
  timestamp: Date;
  notes?: string;
}

export interface TargetRange {
  context: ReadingContext;
  min: number;         // mmol/L
  max: number;         // mmol/L
}

export interface AppSettings {
  id?: number;
  unit: GlucoseUnit;
  targets: TargetRange[];
  a1cTarget: number;
  reminderEnabled: boolean;
  patientName: string;
  /** Upper limit for fasting readings — stored in mmol/L. Default ≈6.7 mmol/L (120 mg/dL) */
  fastingLimit?: number;
  /** Upper limit for all post-meal readings — stored in mmol/L. Default ≈8.9 mmol/L (160 mg/dL) */
  postprandialLimit?: number;
}

export type GlucoseStatus = 'low' | 'normal' | 'high' | 'very_high';

export interface GlucoseStats {
  avg: number;
  min: number;
  max: number;
  pctInRange: number;
  estimatedA1c: number;
  count: number;
}
