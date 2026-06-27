import { formatGlucose, unitLabel, getStatusColor } from '@/utils/glucoseUtils';
import type { GlucoseStatus, GlucoseUnit } from '@/types';

interface ReadingBadgeProps {
  mmolValue: number;
  displayUnit: GlucoseUnit;
  status: GlucoseStatus;
  size?: 'sm' | 'lg';
}

export default function ReadingBadge({ mmolValue, displayUnit, status, size = 'sm' }: ReadingBadgeProps) {
  const color = getStatusColor(status);
  return (
    <div
      className="inline-flex items-baseline gap-1 rounded-[4px] border font-mono font-bold"
      style={{ color, borderColor: color }}
    >
      <span className={size === 'lg' ? 'text-5xl px-4 py-2' : 'text-base px-2.5 py-0.5'}>
        {formatGlucose(mmolValue, displayUnit)}
      </span>
      <span
        className="font-normal"
        style={{ fontSize: size === 'lg' ? '14px' : '10px', paddingRight: size === 'lg' ? '16px' : '10px' }}
      >
        {unitLabel(displayUnit)}
      </span>
    </div>
  );
}
