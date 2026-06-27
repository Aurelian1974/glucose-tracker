import { subDays, setHours, setMinutes, setSeconds } from 'date-fns';
import type { GlucoseReading, ReadingContext } from '@/types';

interface DaySlot {
  context: ReadingContext;
  hour: number;
  minute: number;
  baseMean: number;
  variation: number;
}

const DAILY_PROFILE: DaySlot[] = [
  { context: 'fasting',    hour: 7,  minute: 0,  baseMean: 7.8,  variation: 2.5 },
  { context: 'after_meal', hour: 9,  minute: 30, baseMean: 10.2, variation: 3.0 },
  { context: 'after_meal', hour: 14, minute: 0,  baseMean: 9.8,  variation: 3.5 },
  { context: 'after_meal', hour: 21, minute: 0,  baseMean: 10.5, variation: 4.0 },
];

function seededVariation(daySeed: number, slotIndex: number, variation: number): number {
  const seed = (daySeed * 31 + slotIndex * 7) % 100;
  const normalized = (seed / 50) - 1;
  return normalized * variation;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateSeedReadings(days = 30): Omit<GlucoseReading, 'id'>[] {
  const readings: Omit<GlucoseReading, 'id'>[] = [];
  const today = new Date();

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const date = subDays(today, dayOffset);
    const dayIndex = days - 1 - dayOffset;

    DAILY_PROFILE.forEach((slot, slotIndex) => {
      let value = slot.baseMean + seededVariation(dayIndex, slotIndex, slot.variation);

      if (dayIndex === 2  && slotIndex === 0) value = 3.2;
      if (dayIndex === 6  && slotIndex === 3) value = 15.8;
      if (dayIndex === 14) value = slotIndex === 0 ? 5.8 : 7.4 + slotIndex * 0.3;
      if (dayIndex === 27) value = slotIndex === 0 ? 9.5 : 12.0 + slotIndex * 0.8;

      value = clamp(parseFloat(value.toFixed(1)), 2.5, 22.0);

      const timestamp = setSeconds(
        setMinutes(setHours(date, slot.hour), slot.minute + (slotIndex % 3)),
        0,
      );

      readings.push({
        value,
        context: slot.context,
        timestamp,
        notes:
          dayIndex === 2  && slotIndex === 0 ? 'Hipoglicemie — am mers la sală seara'
          : dayIndex === 6 && slotIndex === 3 ? 'Cină la restaurant, mai mult decât trebuia'
          : undefined,
      });
    });
  }

  return readings;
}

export const SEED_READINGS_COUNT = 30 * DAILY_PROFILE.length;
