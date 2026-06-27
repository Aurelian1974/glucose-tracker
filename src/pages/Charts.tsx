import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend, LabelList,
} from 'recharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useReadings } from '@/hooks/useReadings';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';
import GlucoseTrendChart from '@/components/charts/GlucoseTrendChart';
import TimeInRange from '@/components/charts/TimeInRange';
import DateRangeScrubber, { localDateStr, type ChipId } from '@/components/DateRangeScrubber';
import { type SlotFilter, SLOT_FILTER_LABELS } from '@/utils/slotFilter';
import { formatGlucose, MMOL_TO_MGDL } from '@/utils/glucoseUtils';
import { DEFAULT_FASTING_LIMIT_MMOL, DEFAULT_POSTPRANDIAL_LIMIT_MMOL } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { GlucoseReading, AppSettings } from '@/types';

type Period = 7 | 14 | 30 | 90;
const PERIODS: Period[] = [7, 14, 30, 90];

// The 4 daily measurement slots
const MEAL_SLOTS = [
  { id: 'fasting',  label: 'À jeun',          filter: (r: GlucoseReading) => r.context === 'fasting' },
  { id: 'post_md',  label: 'Post mic-dejun',   filter: (r: GlucoseReading) => r.context === 'after_meal' && r.timestamp.getHours() < 11 },
  { id: 'post_pz',  label: 'Post prânz',       filter: (r: GlucoseReading) => r.context === 'after_meal' && r.timestamp.getHours() >= 11 && r.timestamp.getHours() < 16 },
  { id: 'post_cn',  label: 'Post cină',        filter: (r: GlucoseReading) => r.context === 'after_meal' && r.timestamp.getHours() >= 16 },
] as const;

// Colors per slot — distinct, print-safe
const SLOT_COLORS = {
  fasting:  '#2DD4BF',  // teal
  post_md:  '#60A5FA',  // blue
  post_pz:  '#FB923C',  // orange
  post_cn:  '#A78BFA',  // violet
} as const;

interface CombinedPoint {
  date: number;
  fasting?: number;
  post_md?: number;
  post_pz?: number;
  post_cn?: number;
}

interface CombinedChartProps {
  readings: GlucoseReading[];
  settings: AppSettings;
  fastingLimit: number;
  postprandialLimit: number;
}

function CombinedChart({ readings, settings, fastingLimit, postprandialLimit }: CombinedChartProps) {
  const tickStyle = { fill: '#484F58', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' };

  const data = useMemo((): CombinedPoint[] => {
    const byDate = new Map<string, CombinedPoint>();
    for (const r of readings) {
      const key = format(r.timestamp, 'yyyy-MM-dd');
      if (!byDate.has(key)) byDate.set(key, { date: new Date(key + 'T12:00:00').getTime() });
      const pt = byDate.get(key)!;
      const val = settings.unit === 'mmol' ? r.value : Math.round(r.value * MMOL_TO_MGDL);
      const h   = r.timestamp.getHours();
      if (r.context === 'fasting') pt.fasting = val;
      else if (r.context === 'after_meal') {
        if (h < 11)       pt.post_md = val;
        else if (h < 16)  pt.post_pz = val;
        else              pt.post_cn = val;
      }
    }
    return [...byDate.values()].sort((a, b) => a.date - b.date);
  }, [readings, settings.unit]);

  const yFastingLimit  = settings.unit === 'mmol' ? fastingLimit       : Math.round(fastingLimit       * MMOL_TO_MGDL);
  const yPostLimit     = settings.unit === 'mmol' ? postprandialLimit  : Math.round(postprandialLimit  * MMOL_TO_MGDL);
  const unit = settings.unit === 'mmol' ? 'mmol/L' : 'mg/dL';

  if (data.length === 0) {
    return (
      <div className="h-[80px] flex items-center justify-center">
        <span className="font-mono text-[11px] text-gt-muted">Nicio dată pentru perioada selectată</span>
      </div>
    );
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={d => format(new Date(d as number), 'dd MMM', { locale: ro })}
            tick={tickStyle}
            stroke="#30363D"
            tickLine={false}
            axisLine={{ stroke: '#30363D' }}
            minTickGap={40}
          />
          <YAxis tick={tickStyle} stroke="transparent" tickLine={false} axisLine={false} width={40} />
          {/* Limit lines */}
          <ReferenceLine y={yFastingLimit} stroke={SLOT_COLORS.fasting}  strokeDasharray="4 3" strokeWidth={1}
            label={{ value: `${yFastingLimit} ${unit}`, position: 'insideTopLeft', fill: SLOT_COLORS.fasting, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} />
          <ReferenceLine y={yPostLimit}    stroke={SLOT_COLORS.post_pz} strokeDasharray="4 3" strokeWidth={1}
            label={{ value: `${yPostLimit} ${unit}`, position: 'insideTopRight', fill: SLOT_COLORS.post_pz, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} />
          {/* 4 lines */}
          <Line type="monotone" dataKey="fasting" name="À jeun"         stroke={SLOT_COLORS.fasting} strokeWidth={1.5} dot={false} connectNulls activeDot={{ r: 3 }}>
            <LabelList dataKey="fasting" position="top" offset={3} className="chart-print-label" style={{ fill: SLOT_COLORS.fasting, fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }} formatter={(v: number) => v ? (settings.unit === 'mmol' ? v.toFixed(1) : String(Math.round(v))) : ''} />
          </Line>
          <Line type="monotone" dataKey="post_md" name="Post mic-dejun" stroke={SLOT_COLORS.post_md} strokeWidth={1.5} dot={false} connectNulls activeDot={{ r: 3 }}>
            <LabelList dataKey="post_md" position="top" offset={3} className="chart-print-label" style={{ fill: SLOT_COLORS.post_md, fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }} formatter={(v: number) => v ? (settings.unit === 'mmol' ? v.toFixed(1) : String(Math.round(v))) : ''} />
          </Line>
          <Line type="monotone" dataKey="post_pz" name="Post prânz"     stroke={SLOT_COLORS.post_pz} strokeWidth={1.5} dot={false} connectNulls activeDot={{ r: 3 }}>
            <LabelList dataKey="post_pz" position="top" offset={3} className="chart-print-label" style={{ fill: SLOT_COLORS.post_pz, fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }} formatter={(v: number) => v ? (settings.unit === 'mmol' ? v.toFixed(1) : String(Math.round(v))) : ''} />
          </Line>
          <Line type="monotone" dataKey="post_cn" name="Post cină"      stroke={SLOT_COLORS.post_cn} strokeWidth={1.5} dot={false} connectNulls activeDot={{ r: 3 }}>
            <LabelList dataKey="post_cn" position="top" offset={3} className="chart-print-label" style={{ fill: SLOT_COLORS.post_cn, fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }} formatter={(v: number) => v ? (settings.unit === 'mmol' ? v.toFixed(1) : String(Math.round(v))) : ''} />
          </Line>
          <Tooltip
            contentStyle={{ backgroundColor: '#1C2128', border: '0.5px solid #30363D', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
            labelStyle={{ color: '#8B949E', marginBottom: '4px' }}
            labelFormatter={d => format(new Date(d as number), 'dd MMM yyyy', { locale: ro })}
            formatter={(v, name) => [v ? `${v} ${unit}` : '—', name]}
          />
          <Legend
            wrapperStyle={{ paddingTop: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}
            formatter={(value) => <span style={{ color: '#8B949E' }}>{value}</span>}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

interface SlotChartProps {
  label: string;
  readings: GlucoseReading[];
  settings: AppSettings;
  limitMmol: number;
}

function SlotChart({ label, readings, settings, limitMmol }: SlotChartProps) {
  const avg = readings.length > 0
    ? readings.reduce((s, r) => s + r.value, 0) / readings.length
    : null;

  return (
    <div className="chart-card bg-gt-surface border border-gt-border rounded-[4px] p-4 mb-3">
      {/* Header: label + quick stats */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans">
          {label}
        </span>
        {avg !== null ? (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-gt-muted">
              {readings.length} val.
            </span>
            <span className="font-mono text-sm font-bold text-gt-accent">
              ∅ {formatGlucose(avg, settings.unit)}
              <span className="font-normal text-[10px] text-gt-muted ml-1">
                {settings.unit === 'mmol' ? 'mmol/L' : 'mg/dL'}
              </span>
            </span>
          </div>
        ) : (
          <span className="font-mono text-[10px] text-gt-muted">—</span>
        )}
      </div>

      {readings.length > 0 ? (
        <div className="chart-compact">
          <GlucoseTrendChart readings={readings} settings={settings} height={130} limitValue={limitMmol} />
        </div>
      ) : (
        <div className="h-[60px] flex items-center justify-center">
          <span className="font-mono text-[11px] text-gt-muted">Nicio dată</span>
        </div>
      )}
    </div>
  );
}

export default function Charts() {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Grafice_Glicemie_${localDateStr()}`,
  });
  const allReadings = useReadings();
  const settings    = useSettings();

  // Date range state (same as History)
  const [chip,     setChip]     = useState<ChipId>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo,   setDateTo]   = useState<string>(() => localDateStr());
  const [slot,     setSlot]     = useState<SlotFilter>('all');

  const firstDate = useMemo(() => {
    const oldest = allReadings?.at(-1);
    return oldest ? localDateStr(oldest.timestamp) : localDateStr();
  }, [allReadings]);

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

  // Filter readings by date range
  const readings = useMemo(() => {
    if (!allReadings) return undefined;
    let result = allReadings;
    if (dateFrom) result = result.filter(r => r.timestamp.getTime() >= new Date(dateFrom + 'T00:00:00').getTime());
    if (dateTo)   result = result.filter(r => r.timestamp.getTime() <= new Date(dateTo   + 'T23:59:59').getTime());
    return result;
  }, [allReadings, dateFrom, dateTo]);

  // Visible slots: all when slot==='all', else only matching
  const visibleSlots = useMemo(() => {
    if (slot === 'all') return MEAL_SLOTS;
    return MEAL_SLOTS.filter(s => s.id === slot);
  }, [slot]);

  // Per-slot filtered readings
  const slotReadings = useMemo(() => {
    if (!readings) return MEAL_SLOTS.map(() => [] as GlucoseReading[]);
    return MEAL_SLOTS.map(s => readings.filter(s.filter));
  }, [readings]);

  const stats = useStats(readings, settings.targets);
  const fastingLimit      = settings.fastingLimit      ?? DEFAULT_FASTING_LIMIT_MMOL;
  const postprandialLimit = settings.postprandialLimit ?? DEFAULT_POSTPRANDIAL_LIMIT_MMOL;

  if (allReadings === undefined) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gt-surface rounded-[4px] h-40" />
        ))}
      </div>
    );
  }

  const card = 'chart-card bg-gt-surface border border-gt-border rounded-[4px] p-4 mb-3';
  const sectionLabel = 'text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-3';

  return (
    <div>
      {/* Filter bar — sticky, hidden in print */}
      <div className="no-print sticky top-0 z-10 bg-gt-elevated border-b border-gt-border px-4 pt-3 pb-2">
        <DateRangeScrubber
          minDate={firstDate || localDateStr()}
          maxDate={localDateStr()}
          dateFrom={dateFrom || firstDate || localDateStr()}
          dateTo={dateTo || localDateStr()}
          chip={chip}
          onChange={handleScrubberChange}
        >
          {/* Slot filter */}
          <select
            value={slot}
            onChange={e => setSlot(e.target.value as SlotFilter)}
            className="bg-gt-surface border border-gt-border rounded-[4px] font-mono text-[11px] text-gt-secondary px-2 py-1 focus:outline-none focus:border-gt-accent"
          >
            {(Object.keys(SLOT_FILTER_LABELS) as SlotFilter[]).map(s => (
              <option key={s} value={s}>{SLOT_FILTER_LABELS[s]}</option>
            ))}
          </select>
          <span className="font-mono text-[11px] text-gt-muted whitespace-nowrap">
            {readings?.length ?? 0} val.
          </span>
          <button
            onClick={() => handlePrint()}
            className="text-gt-muted hover:text-gt-text transition-colors"
            title="Printează graficele"
          >
            <Printer className="w-4 h-4" />
          </button>
        </DateRangeScrubber>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="px-4 pt-4 pb-4">

        {/* Print-only report header */}
        <div className="print-only" style={{ display: 'none', marginBottom: '16pt', borderBottom: '1.5pt solid #333', paddingBottom: '8pt' }}>
          <strong style={{ fontSize: '14pt', color: '#111', display: 'block' }}>Raport Grafice Glicemie</strong>
          <span style={{ fontSize: '9pt', color: '#555' }}>
            Perioadă: {(dateFrom || firstDate).split('-').reverse().join('.')} – {dateTo.split('-').reverse().join('.')}
            {settings.patientName && <> &nbsp;·&nbsp; {settings.patientName}</>}
          </span>
        </div>

      {/* Combined chart — always visible */}
      <div className={card}>
        <p className={sectionLabel}>Evoluție combinată</p>
        <CombinedChart
          readings={readings ?? []}
          settings={settings}
          fastingLimit={fastingLimit}
          postprandialLimit={postprandialLimit}
        />
      </div>

      {/* Per-slot trend charts */}
      {visibleSlots.map((slot, i) => {
        const idx = MEAL_SLOTS.indexOf(slot);
        return (
          <SlotChart
            key={slot.id}
            label={slot.label}
            readings={slotReadings[idx] ?? []}
            settings={settings}
            limitMmol={slot.id === 'fasting' ? fastingLimit : postprandialLimit}
          />
        );
      })}

      {/* Time in range */}
      <div className={card}>
        <p className={sectionLabel}>Timp în țintă</p>
        <TimeInRange readings={readings ?? []} targets={settings.targets} />
      </div>

      {/* A1c Estimator */}
      <div className={card}>
        <p className={sectionLabel}>HbA1c estimat</p>
        {stats ? (
          <>
            <div className="font-mono font-bold text-gt-text" style={{ fontSize: '40px', lineHeight: 1 }}>
              {stats.estimatedA1c.toFixed(1)}%
            </div>
            <p className="font-mono text-[11px] text-gt-muted mt-2">
              bazat pe {stats.count} valori · {dateFrom && dateTo ? `${dateFrom.split('-').reverse().join('.')} – ${dateTo.split('-').reverse().join('.')}` : 'toate datele'}
            </p>
            <p className="font-mono text-[10px] text-gt-high mt-1">
              ⚠ estimativ · nu înlocuiește testul de laborator
            </p>
          </>
        ) : (
          <p className="font-mono text-[13px] text-gt-muted">Date insuficiente</p>
        )}
      </div>
      </div>
    </div>
  );
}


