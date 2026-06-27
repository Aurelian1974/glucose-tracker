import type { GlucoseUnit, GlucoseStatus, ReadingContext, TargetRange } from '@/types';

// --- Conversions ---
export const MMOL_TO_MGDL = 18.0182;

export function toMmol(value: number, fromUnit: GlucoseUnit): number {
  return fromUnit === 'mgdl' ? value / MMOL_TO_MGDL : value;
}

export function formatGlucose(mmolValue: number, displayUnit: GlucoseUnit): string {
  if (displayUnit === 'mgdl') {
    return Math.round(mmolValue * MMOL_TO_MGDL).toString();
  }
  return mmolValue.toFixed(1);
}

export function unitLabel(unit: GlucoseUnit): string {
  return unit === 'mmol' ? 'mmol/L' : 'mg/dL';
}

// --- Validation ---
export const VALIDATION = {
  mmol: { min: 1.0, max: 33.3 },
  mgdl: { min: 18, max: 600 },
};

export function validateGlucoseInput(value: number, inputUnit: GlucoseUnit): boolean {
  const limits = VALIDATION[inputUnit];
  return value >= limits.min && value <= limits.max;
}

// --- Target ranges (ADA Guidelines) ---
export const DEFAULT_TARGETS: TargetRange[] = [
  { context: 'fasting',     min: 3.9, max: 7.2  },
  { context: 'before_meal', min: 3.9, max: 7.2  },
  { context: 'after_meal',  min: 3.9, max: 10.0 },
  { context: 'bedtime',     min: 5.6, max: 7.8  },
  { context: 'random',      min: 3.9, max: 10.0 },
];

export const LOW_THRESHOLD       = 3.9;
export const VERY_HIGH_THRESHOLD = 13.9;

// --- Status ---
export function getGlucoseStatus(
  mmolValue: number,
  context: ReadingContext,
  targets: TargetRange[]
): GlucoseStatus {
  const target = targets.find(t => t.context === context) ?? DEFAULT_TARGETS[0]!;
  if (mmolValue < LOW_THRESHOLD)        return 'low';
  if (mmolValue > VERY_HIGH_THRESHOLD)  return 'very_high';
  if (mmolValue < target.min || mmolValue > target.max) return 'high';
  return 'normal';
}

export function getStatusColor(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return '#60A5FA';
    case 'normal':    return '#2DD4BF';
    case 'high':      return '#F59E0B';
    case 'very_high': return '#EF4444';
  }
}

export function getStatusLabel(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return 'SCĂZUT';
    case 'normal':    return 'NORMAL';
    case 'high':      return 'RIDICAT';
    case 'very_high': return 'F. RIDICAT';
  }
}

export function getStatusPrintLabel(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return '▼ Scăzut';
    case 'normal':    return '✓ Normal';
    case 'high':      return '▲ Ridicat';
    case 'very_high': return '!! F. ridicat';
  }
}

/** Tailwind text class for each status */
export function getStatusTextClass(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return 'text-gt-low';
    case 'normal':    return 'text-gt-accent';
    case 'high':      return 'text-gt-high';
    case 'very_high': return 'text-gt-very-high';
  }
}

export const STATUS_COLORS: Record<GlucoseStatus, string> = {
  low:       '#60A5FA',
  normal:    '#2DD4BF',
  high:      '#F59E0B',
  very_high: '#EF4444',
};

export const CHART_COLORS = {
  line:     '#2DD4BF',
  fill:     '#2DD4BF',
  high:     '#F59E0B',
  low:      '#60A5FA',
  veryHigh: '#EF4444',
  grid:     '#30363D',
  tick:     '#484F58',
};

// --- Time ago ---
export function formatTimeAgo(date: Date): string {
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMin / 60);
  const diffD   = Math.floor(diffH / 24);

  if (diffMin < 1)  return 'acum';
  if (diffMin < 60) return `${diffMin} min în urmă`;
  if (diffH < 24)   return `${diffH}h în urmă`;
  if (diffD === 1)  return 'ieri';
  return `${diffD}z în urmă`;
}
