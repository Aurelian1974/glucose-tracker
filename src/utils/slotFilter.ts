import type { GlucoseReading } from '@/types';

export type SlotFilter = 'all' | 'fasting' | 'post_md' | 'post_pz' | 'post_cn' | 'bedtime' | 'random';

export const SLOT_FILTER_LABELS: Record<SlotFilter, string> = {
  all:     'Toate',
  fasting: 'À jeun',
  post_md: 'Post mic-dejun',
  post_pz: 'Post prânz',
  post_cn: 'Post cină',
  bedtime: 'Seara',
  random:  'Aleatoriu',
};

export function matchesSlot(r: GlucoseReading, slot: SlotFilter): boolean {
  if (slot === 'all')     return true;
  if (slot === 'fasting') return r.context === 'fasting';
  if (slot === 'bedtime') return r.context === 'bedtime';
  if (slot === 'random')  return r.context === 'random';
  if (r.context !== 'after_meal') return false;
  const h = r.timestamp.getHours();
  if (slot === 'post_md') return h < 11;
  if (slot === 'post_pz') return h >= 11 && h < 16;
  if (slot === 'post_cn') return h >= 16;
  return false;
}
