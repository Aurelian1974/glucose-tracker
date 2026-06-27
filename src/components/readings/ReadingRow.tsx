import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { formatGlucose, getGlucoseStatus, getStatusColor } from '@/utils/glucoseUtils';
import { CONTEXT_SHORT_LABELS } from '@/utils/constants';
import type { GlucoseReading, GlucoseUnit, TargetRange } from '@/types';

interface ReadingRowProps {
  reading: GlucoseReading;
  displayUnit: GlucoseUnit;
  targets: TargetRange[];
  onDelete: (id: number) => void;
}

export default function ReadingRow({ reading, displayUnit, targets, onDelete }: ReadingRowProps) {
  const [confirming, setConfirming] = useState(false);
  const status  = getGlucoseStatus(reading.value, reading.context, targets);
  const color   = getStatusColor(status);
  const dateStr = format(reading.timestamp, 'dd MMM');
  const timeStr = format(reading.timestamp, 'HH:mm');

  function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    if (reading.id != null) onDelete(reading.id);
  }

  return (
    <div
      className="flex items-center h-[60px] border-b border-gt-border hover:bg-gt-elevated transition-colors group"
      style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px' }}
    >
      {/* Date + time */}
      <div className="w-20 flex-shrink-0 pr-2">
        <div className="font-mono text-xs text-gt-text">{dateStr}</div>
        <div className="font-mono text-[11px] text-gt-muted">{timeStr}</div>
      </div>

      {/* Context badge */}
      <div className="w-24 flex-shrink-0">
        <span
          className="font-mono text-[10px] border rounded-[4px] px-1.5 py-0.5 whitespace-nowrap"
          style={{ color, borderColor: color }}
        >
          {CONTEXT_SHORT_LABELS[reading.context]}
        </span>
      </div>

      {/* Value */}
      <div className="flex-1 text-right pr-3">
        <span className="font-mono text-xl font-bold" style={{ color }}>
          {formatGlucose(reading.value, displayUnit)}
        </span>
        <span className="font-mono text-[10px] text-gt-muted ml-1">
          {displayUnit === 'mmol' ? 'mmol/L' : 'mg/dL'}
        </span>
      </div>

      {/* Delete */}
      <div className="w-16 flex-shrink-0 flex items-center justify-end pr-3">
        {confirming ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="font-mono text-[10px] text-gt-very-high hover:underline"
            >
              Da
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="font-mono text-[10px] text-gt-muted hover:text-gt-secondary"
            >
              Nu
            </button>
          </div>
        ) : (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-gt-muted hover:text-gt-very-high transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
