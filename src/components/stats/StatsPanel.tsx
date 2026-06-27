import type { GlucoseStats, GlucoseUnit } from '@/types';
import { formatGlucose, unitLabel } from '@/utils/glucoseUtils';

interface Props {
  stats: GlucoseStats;
  unit: GlucoseUnit;
}

export default function StatsPanel({ stats, unit }: Props) {
  return (
    <div className="grid grid-cols-3 border-b border-gt-border">
      {/* Col 1: Weekly average */}
      <div className="flex flex-col items-center justify-center h-[72px] border-r border-gt-border px-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-1">
          Med 7Z
        </span>
        <span className="font-mono text-2xl font-bold text-gt-text">
          {formatGlucose(stats.avg, unit)}
        </span>
        <span className="font-mono text-[11px] text-gt-muted">{unitLabel(unit)}</span>
      </div>

      {/* Col 2: Time in range */}
      <div className="flex flex-col items-center justify-center h-[72px] border-r border-gt-border px-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-1">
          În țintă
        </span>
        <span className="font-mono text-2xl font-bold text-gt-accent">
          {stats.pctInRange}%
        </span>
        <span className="font-mono text-[11px] text-gt-muted">din {stats.count} val.</span>
      </div>

      {/* Col 3: Estimated A1c */}
      <div className="flex flex-col items-center justify-center h-[72px] px-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-1">
          HbA1c Est.
        </span>
        <span className="font-mono text-2xl font-bold text-gt-text">
          {stats.estimatedA1c.toFixed(1)}%
        </span>
        <span className="font-mono text-[10px] text-gt-high">⚠ estimat</span>
      </div>
    </div>
  );
}
