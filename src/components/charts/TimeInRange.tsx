import type { GlucoseReading, TargetRange } from '@/types';
import { getGlucoseStatus } from '@/utils/glucoseUtils';

interface Props {
  readings: GlucoseReading[];
  targets: TargetRange[];
}

interface Segment {
  label: string;
  pct: number;
  color: string;
}

export default function TimeInRange({ readings, targets }: Props) {
  if (readings.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-gt-muted font-mono text-sm">
        Nicio dată
      </div>
    );
  }

  const counts = { low: 0, normal: 0, high: 0, very_high: 0 };
  for (const r of readings) {
    counts[getGlucoseStatus(r.value, r.context, targets)]++;
  }
  const total = readings.length;
  const pct = {
    low:       Math.round((counts.low       / total) * 100),
    normal:    Math.round((counts.normal    / total) * 100),
    high:      Math.round((counts.high      / total) * 100),
    very_high: Math.round((counts.very_high / total) * 100),
  };

  const segments: Segment[] = [
    { label: 'Scăzut',      pct: pct.low,       color: '#60A5FA' },
    { label: 'În țintă',    pct: pct.normal,     color: '#2DD4BF' },
    { label: 'Ridicat',     pct: pct.high,       color: '#F59E0B' },
    { label: 'F. ridicat',  pct: pct.very_high,  color: '#EF4444' },
  ].filter(s => s.pct > 0);

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-8 rounded-[4px] overflow-hidden gap-[1px]">
        {segments.map(seg => (
          <div
            key={seg.label}
            style={{ width: `${seg.pct}%`, backgroundColor: seg.color, opacity: 0.85 }}
            className="flex items-center justify-center"
            title={`${seg.label}: ${seg.pct}%`}
          >
            {seg.pct >= 10 && (
              <span className="font-mono text-[10px] font-bold text-gt-bg">
                {seg.pct}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map(seg => (
          <span key={seg.label} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="font-mono text-[11px] text-gt-secondary">
              {seg.label} {seg.pct}%
            </span>
          </span>
        ))}
      </div>

      {/* Summary line */}
      <p className="font-mono text-[11px] text-gt-muted mt-2">
        {pct.normal}% în țintă · {pct.low}% scăzut · {pct.high + pct.very_high}% ridicat
      </p>
    </div>
  );
}
