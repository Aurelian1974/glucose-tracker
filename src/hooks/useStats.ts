import { useMemo } from 'react';
import type { GlucoseReading, GlucoseStats, TargetRange } from '@/types';
import { getGlucoseStatus } from '@/utils/glucoseUtils';

export function useStats(
  readings: GlucoseReading[] | undefined,
  targets: TargetRange[],
): GlucoseStats | null {
  return useMemo(() => {
    if (!readings || readings.length === 0) return null;

    const values = readings.map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const inRangeCount = readings.filter(
      r => getGlucoseStatus(r.value, r.context, targets) === 'normal',
    ).length;

    // Nathan (ADAG) formula: eA1c = (avg_mmol + 2.59) / 1.59
    const estimatedA1c = (avg + 2.59) / 1.59;

    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      pctInRange: Math.round((inRangeCount / readings.length) * 100),
      estimatedA1c,
      count: readings.length,
    };
  }, [readings, targets]);
}
