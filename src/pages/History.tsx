import { useState, useMemo, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Trash2, Printer } from 'lucide-react';
import { useReadings, deleteReading } from '@/hooks/useReadings';
import { useSettings } from '@/hooks/useSettings';
import { exportReadingsToCSV } from '@/utils/exportUtils';
import { formatGlucose, getGlucoseStatus, getStatusColor } from '@/utils/glucoseUtils';
import { CONTEXT_SHORT_LABELS } from '@/utils/constants';
import type { ReadingContext, GlucoseReading } from '@/types';
import { cn } from '@/utils/cn';
import { useReactToPrint } from 'react-to-print';
import DateRangeScrubber, { localDateStr, type ChipId } from '@/components/DateRangeScrubber';
import { type SlotFilter, SLOT_FILTER_LABELS, matchesSlot } from '@/utils/slotFilter';

interface SlotCellProps {
  reading: GlucoseReading | undefined;
  unit: ReturnType<typeof useSettings>['unit'];
  targets: ReturnType<typeof useSettings>['targets'];
  onDelete: (id: number) => void;
}

function SlotCell({ reading, unit, targets, onDelete }: SlotCellProps) {
  const [confirm, setConfirm] = useState(false);

  if (!reading) {
    return <span className="font-mono text-[11px] text-gt-muted">—</span>;
  }

  const status = getGlucoseStatus(reading.value, reading.context, targets);
  const color  = getStatusColor(status);

  return (
    <div className="group/slot flex flex-col items-center gap-0.5">
      {/* Value + delete */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-sm font-bold" style={{ color }}>
          {formatGlucose(reading.value, unit)}
        </span>
        {confirm ? (
          <span className="flex gap-1">
            <button
              onClick={() => { if (reading.id != null) { onDelete(reading.id); setConfirm(false); } }}
              className="font-mono text-[9px] text-gt-very-high"
            >✕</button>
            <button onClick={() => setConfirm(false)} className="font-mono text-[9px] text-gt-muted">↩</button>
          </span>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="opacity-0 group-hover/slot:opacity-100 text-gt-muted hover:text-gt-very-high transition-all"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
      {/* Time — hidden in print */}
      <span className="no-print font-mono text-[9px] text-gt-muted">{format(reading.timestamp, 'HH:mm')}</span>
      {/* Context badge — hidden in print */}
      <span
        className="no-print font-mono text-[8px] border rounded-[2px] px-1 leading-tight"
        style={{ color, borderColor: `${color}60` }}
      >
        {CONTEXT_SHORT_LABELS[reading.context]}
      </span>
    </div>
  );
}

type Period = never; // kept to avoid reference errors — unused

export default function History() {
  const allReadings = useReadings();
  const settings    = useSettings();

  const [chip,     setChip]     = useState<ChipId>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo,   setDateTo]   = useState<string>(() => localDateStr());
  const [slot,     setSlot]     = useState<SlotFilter>('all');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Istoric_Glicemie_${localDateStr()}`,
  });

  // Oldest reading date (scrubber left edge)
  const firstDate = useMemo(() => {
    const oldest = allReadings?.at(-1);
    return oldest ? localDateStr(oldest.timestamp) : localDateStr();
  }, [allReadings]);

  // Initialize to full range when data loads
  useEffect(() => {
    if (firstDate && chip === 'all') {
      setDateFrom(firstDate);
      setDateTo(localDateStr());
    }
  }, [firstDate]); // only when firstDate resolves

  function handleScrubberChange(newChip: ChipId, from: string, to: string) {
    setChip(newChip);
    setDateFrom(from);
    setDateTo(to);
  }

  const filtered = useMemo(() => {
    if (!allReadings) return [];
    let result = allReadings;
    if (dateFrom) {
      const fromTs = new Date(dateFrom + 'T00:00:00').getTime();
      result = result.filter(r => r.timestamp.getTime() >= fromTs);
    }
    if (dateTo) {
      const toTs = new Date(dateTo + 'T23:59:59').getTime();
      result = result.filter(r => r.timestamp.getTime() <= toTs);
    }
    if (slot !== 'all') result = result.filter(r => matchesSlot(r, slot));
    return result;
  }, [allReadings, dateFrom, dateTo, slot]);

  // Group by date, each day's readings sorted by time ascending
  const dateGroups = useMemo(() => {
    const byDate = new Map<string, GlucoseReading[]>();
    for (const r of filtered) {
      const key = format(r.timestamp, 'yyyy-MM-dd');
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(r);
    }
    for (const readings of byDate.values()) {
      readings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  // Number of columns = max readings in a single day (min 1, max 8)
  const numSlots = useMemo(() => {
    if (dateGroups.length === 0) return 4;
    return Math.min(Math.max(...dateGroups.map(([, r]) => r.length), 1), 8);
  }, [dateGroups]);

  // Column header = dominant context + time-aware label for after_meal slots
  const slotHeaders = useMemo(() => {
    return Array.from({ length: numSlots }, (_, i) => {
      const counts: Partial<Record<ReadingContext, number>> = {};
      let totalHour = 0;
      let countHour = 0;
      for (const [, readings] of dateGroups) {
        const r = readings[i];
        if (r) {
          counts[r.context] = (counts[r.context] ?? 0) + 1;
          totalHour += r.timestamp.getHours() + r.timestamp.getMinutes() / 60;
          countHour++;
        }
      }
      const dominant = (Object.entries(counts) as [ReadingContext, number][])
        .sort((a, b) => b[1] - a[1]).at(0)?.[0] ?? 'random';

      // For after_meal slots use the average hour to differentiate breakfast / lunch / dinner
      if (dominant === 'after_meal' && countHour > 0) {
        const avgH = totalHour / countHour;
        if (avgH < 11) return 'Post mic-dejun';
        if (avgH < 16) return 'Post prânz';
        return 'Post cină';
      }

      return CONTEXT_SHORT_LABELS[dominant];
    });
  }, [dateGroups, numSlots]);

  if (allReadings === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gt-surface border-b border-gt-border" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[52px] bg-gt-surface border-b border-gt-border" />
        ))}
      </div>
    );
  }

  const thCls = 'px-2 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-gt-muted border-b border-gt-border font-normal whitespace-nowrap';

  return (
    <div>
      {/* Filter bar — sticky */}
      <div className="no-print sticky top-0 z-10 bg-gt-elevated border-b border-gt-border px-4 pt-3 pb-2">
        <DateRangeScrubber
          minDate={firstDate || localDateStr()}
          maxDate={localDateStr()}
          dateFrom={dateFrom || firstDate || localDateStr()}
          dateTo={dateTo || localDateStr()}
          chip={chip}
          onChange={handleScrubberChange}
        >
          <select
            value={slot}
            onChange={e => setSlot(e.target.value as SlotFilter)}
            className="bg-gt-surface border border-gt-border rounded-[4px] font-mono text-[11px] text-gt-secondary px-2 py-1 focus:outline-none focus:border-gt-accent"
          >
            {(Object.keys(SLOT_FILTER_LABELS) as SlotFilter[]).map(s => (
              <option key={s} value={s}>{SLOT_FILTER_LABELS[s]}</option>
            ))}
          </select>
          <button
            onClick={() => exportReadingsToCSV(filtered, settings.unit)}
            className="font-mono text-[12px] text-gt-accent hover:text-gt-text transition-colors"
          >
            ↓ CSV
          </button>
          <button
            onClick={() => handlePrint()}
            className="text-gt-muted hover:text-gt-text transition-colors"
            title="Printează tabelul"
          >
            <Printer className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px] text-gt-muted whitespace-nowrap">
            {filtered.length} {filtered.length === 1 ? 'val.' : 'val.'}
            {dateGroups.length > 0 && <> · {dateGroups.length}Z</>}
          </span>
        </DateRangeScrubber>
      </div>

      {/* Pivoted table — 1 row per day, 1 column per measurement slot */}
      <div ref={printRef}>
        {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-gt-surface">
            <thead>
              {/* Print-only title row — hidden on screen, repeats on every printed page */}
              <tr className="print-only-row" style={{ display: 'none' }}>
                <td
                  colSpan={numSlots + 2}
                  style={{ padding: '6pt 4pt 4pt', borderBottom: '2pt solid #333' }}
                >
                  <strong style={{ fontSize: '14pt', color: '#111', display: 'block', marginBottom: '2pt' }}>
                    Raport Glicemie
                  </strong>
                  <span style={{ fontSize: '9pt', color: '#555' }}>
                    Perioadă: {dateFrom.split('-').reverse().join('.')} – {dateTo.split('-').reverse().join('.')}
                    &nbsp;·&nbsp;{filtered.length} valori · {dateGroups.length} zile
                    {settings.patientName && <>&nbsp;·&nbsp;{settings.patientName}</>}
                  </span>
                </td>
              </tr>
              <tr>
                <th className={cn(thCls, 'text-left sticky left-0 bg-gt-surface border-r border-gt-border w-[64px]')}>
                  Data
                </th>
                {slotHeaders.map((label, i) => (
                  <th key={i} className={cn(thCls, 'text-center border-r border-gt-border min-w-[76px]')}>
                    {label}
                  </th>
                ))}
                <th className={cn(thCls, 'text-center min-w-[60px]')}>
                  Med. zi
                </th>
              </tr>
            </thead>
            <tbody>
              {dateGroups.map(([dateKey, dayReadings]) => {
                const avg = dayReadings.reduce((s, r) => s + r.value, 0) / dayReadings.length;
                const avgStatus = getGlucoseStatus(avg, 'random', settings.targets);
                const avgColor  = getStatusColor(avgStatus);
                const label = format(new Date(dateKey + 'T12:00:00'), 'd MMM', { locale: ro });

                return (
                  <tr key={dateKey} className="border-b border-gt-border hover:bg-gt-elevated transition-colors">
                    {/* Date — sticky left */}
                    <td className="px-3 py-2 font-mono text-sm text-gt-text border-r border-gt-border sticky left-0 bg-gt-surface whitespace-nowrap">
                      {label}
                    </td>

                    {/* One cell per slot */}
                    {Array.from({ length: numSlots }, (_, i) => (
                      <td key={i} className="px-2 py-2 border-r border-gt-border text-center align-middle">
                        <SlotCell
                          reading={dayReadings[i]}
                          unit={settings.unit}
                          targets={settings.targets}
                          onDelete={id => deleteReading(id)}
                        />
                      </td>
                    ))}

                    {/* Daily average */}
                    <td className="px-2 py-2 text-center align-middle">
                      <span className="font-mono text-sm font-bold" style={{ color: avgColor }}>
                        {formatGlucose(avg, settings.unit)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="font-mono text-lg text-gt-muted">NICIO VALOARE</span>
            <span className="font-mono text-[13px] text-gt-accent">
              → Adaugă prima măsurătoare
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

