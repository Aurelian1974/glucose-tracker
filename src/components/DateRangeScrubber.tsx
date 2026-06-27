import { useState, useMemo, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

export function localDateStr(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const CHIP_DEFS = [
  { id: 'today',  label: 'Azi' },
  { id: '7d',     label: '7Z'  },
  { id: '30d',    label: '30Z' },
  { id: '90d',    label: '90Z' },
  { id: 'all',    label: 'Tot' },
  { id: 'custom', label: 'Personalizat ···' },
] as const;

export type ChipId = (typeof CHIP_DEFS)[number]['id'];

const RO_MON = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec'];

interface ScrubberProps {
  minDate:  string;
  maxDate:  string;
  dateFrom: string;
  dateTo:   string;
  chip:     ChipId;
  onChange: (chip: ChipId, from: string, to: string) => void;
  children?: React.ReactNode;
}

export default function DateRangeScrubber({
  minDate, maxDate, dateFrom, dateTo, chip, onChange, children,
}: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'from' | 'to' | null>(null);
  const fromRef  = useRef(dateFrom);
  const toRef    = useRef(dateTo);
  useEffect(() => { fromRef.current = dateFrom; }, [dateFrom]);
  useEffect(() => { toRef.current   = dateTo;   }, [dateTo]);

  const minMs = useMemo(() => new Date((minDate || localDateStr()) + 'T00:00:00').getTime(), [minDate]);
  const maxMs = useMemo(() => new Date((maxDate || localDateStr()) + 'T00:00:00').getTime(), [maxDate]);
  const span  = maxMs - minMs || 1;

  function pctOf(s: string): number {
    return Math.max(0, Math.min(1, (new Date(s + 'T00:00:00').getTime() - minMs) / span));
  }
  const fromPct = pctOf(dateFrom || minDate);
  const toPct   = pctOf(dateTo   || maxDate);

  const ticks = useMemo(() => {
    if (!minDate || !maxDate) return [];
    const result: { pct: number; label: string }[] = [];
    const cursor = new Date(minDate + 'T00:00:00');
    cursor.setDate(1);
    if (cursor.getTime() < minMs) cursor.setMonth(cursor.getMonth() + 1);
    const totalMonths = Math.ceil(span / (30 * 86_400_000));
    const step = totalMonths <= 12 ? 1 : totalMonths <= 24 ? 2 : 3;
    let i = 0;
    while (cursor.getTime() <= maxMs + 86_400_000 && i < 60) {
      const pct = (cursor.getTime() - minMs) / span;
      if (i % step === 0 && pct >= 0 && pct <= 1.01) {
        result.push({ pct: Math.min(1, pct), label: RO_MON[cursor.getMonth()] ?? '' });
      }
      cursor.setMonth(cursor.getMonth() + 1);
      i++;
    }
    return result;
  }, [minDate, maxDate, minMs, maxMs, span]);

  function chipToRange(id: ChipId): { from: string; to: string } | null {
    const today = localDateStr();
    if (id === 'today') return { from: today, to: today };
    if (id === '7d')    return { from: localDateStr(new Date(Date.now() - 6  * 86_400_000)), to: today };
    if (id === '30d')   return { from: localDateStr(new Date(Date.now() - 29 * 86_400_000)), to: today };
    if (id === '90d')   return { from: localDateStr(new Date(Date.now() - 89 * 86_400_000)), to: today };
    if (id === 'all')   return { from: minDate, to: today };
    return null;
  }

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging.current || !trackRef.current) return;
      const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX;
      const { left, width } = trackRef.current.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (clientX - left) / width));
      const date = localDateStr(new Date(minMs + pct * span));
      const from = fromRef.current;
      const to   = toRef.current;
      if (dragging.current === 'from') {
        onChange('custom', date <= to ? date : to, date <= to ? to : date);
      } else {
        onChange('custom', date >= from ? from : date, date >= from ? date : from);
      }
    }
    function onUp() { dragging.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, [minMs, span, onChange]);

  const fillL = Math.min(fromPct, toPct) * 100;
  const fillW = Math.abs(toPct - fromPct) * 100;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CHIP_DEFS.map(c => (
          <button
            key={c.id}
            onClick={() => {
              const r = chipToRange(c.id);
              onChange(c.id, r ? r.from : dateFrom, r ? r.to : dateTo);
            }}
            className={cn(
              'font-mono text-[12px] px-3 py-1.5 rounded-[4px] border transition-all',
              chip === c.id
                ? 'border-gt-accent text-gt-accent'
                : 'border-gt-border text-gt-muted hover:border-gt-border-strong hover:text-gt-text',
            )}
            style={chip === c.id ? { backgroundColor: 'rgba(45,212,191,0.12)' } : undefined}
          >
            {c.label}
          </button>
        ))}
        {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
      </div>

      {chip === 'custom' && (
        <>
          <div className="relative h-[52px] select-none mt-3">
            <div ref={trackRef} className="absolute inset-x-0 top-5 h-1 bg-gt-border rounded-full">
              <div
                className="absolute h-full rounded-full"
                style={{ left: `${fillL}%`, width: `${fillW}%`, backgroundColor: '#2DD4BF' }}
              />
            </div>
            <div
              className="absolute top-3 w-5 h-5 rounded-full border-2 -translate-x-1/2 cursor-grab z-10"
              style={{ left: `${fromPct * 100}%`, borderColor: '#2DD4BF', backgroundColor: '#1C2128' }}
              onMouseDown={e => { dragging.current = 'from'; e.preventDefault(); }}
              onTouchStart={() => { dragging.current = 'from'; }}
            />
            <div
              className="absolute top-3 w-5 h-5 rounded-full border-2 -translate-x-1/2 cursor-grab z-10"
              style={{ left: `${toPct * 100}%`, borderColor: '#2DD4BF', backgroundColor: '#1C2128' }}
              onMouseDown={e => { dragging.current = 'to'; e.preventDefault(); }}
              onTouchStart={() => { dragging.current = 'to'; }}
            />
            {ticks.map((t, i) => (
              <span
                key={i}
                className="absolute bottom-0 font-mono text-[9px] -translate-x-1/2 pointer-events-none"
                style={{ left: `${t.pct * 100}%`, color: '#484F58' }}
              >
                {t.label}
              </span>
            ))}
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="font-mono text-[10px]" style={{ color: '#2DD4BF' }}>
              {dateFrom.split('-').reverse().join('.')}
            </span>
            <span className="font-mono text-[10px]" style={{ color: '#2DD4BF' }}>
              {dateTo.split('-').reverse().join('.')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
