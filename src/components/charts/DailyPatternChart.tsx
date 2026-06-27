import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, LabelList,
} from 'recharts';
import type { GlucoseReading, AppSettings } from '@/types';
import { CONTEXT_SHORT_LABELS, ALL_CONTEXTS } from '@/utils/constants';
import { formatGlucose, CHART_COLORS } from '@/utils/glucoseUtils';
import type { ReadingContext } from '@/types';

interface Props {
  readings: GlucoseReading[];
  settings: AppSettings;
  printMode?: boolean;
}

interface PatternPoint {
  context: string;
  mean: number;
  count: number;
  label: string;
}

interface TooltipPayload {
  payload?: PatternPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-2">
      <div className="font-mono text-[11px] text-gt-muted">{d.context}</div>
      <div className="font-mono text-sm font-bold text-gt-accent">{d.label}</div>
      <div className="font-mono text-[10px] text-gt-muted">{d.count} valori</div>
    </div>
  );
}

export default function DailyPatternChart({ readings, settings, printMode = false }: Props) {
  const tickStyle = { fill: CHART_COLORS.tick, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' };

  const chartData: PatternPoint[] = ALL_CONTEXTS.map(ctx => {
    const contextReadings = readings.filter(r => r.context === ctx);
    const mean = contextReadings.length > 0
      ? contextReadings.reduce((s, r) => s + r.value, 0) / contextReadings.length
      : 0;
    const displayMean = settings.unit === 'mmol' ? mean : mean * 18.0182;
    return {
      context: CONTEXT_SHORT_LABELS[ctx as ReadingContext],
      mean:    parseFloat(displayMean.toFixed(1)),
      count:   contextReadings.length,
      label:   contextReadings.length > 0 ? formatGlucose(mean, settings.unit) : '-',
    };
  });

  const globalMean = readings.length > 0
    ? readings.reduce((s, r) => s + r.value, 0) / readings.length
    : 0;
  const displayGlobalMean = settings.unit === 'mmol' ? globalMean : globalMean * 18.0182;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 16, right: 4, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="context" tick={tickStyle} stroke={CHART_COLORS.grid} tickLine={false} axisLine={{ stroke: CHART_COLORS.grid }} />
        <YAxis tick={tickStyle} stroke="transparent" tickLine={false} axisLine={false} width={32} />
        <Bar dataKey="mean" fill="#2DD4BF" radius={[2, 2, 0, 0]} isAnimationActive={!printMode}>
          <LabelList
            dataKey="label"
            position="top"
            style={{ fill: '#E6EDF3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          />
        </Bar>
        {globalMean > 0 && (
          <ReferenceLine
            y={parseFloat(displayGlobalMean.toFixed(1))}
            stroke={CHART_COLORS.high}
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        )}
        {!printMode && <Tooltip content={<CustomTooltip />} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
