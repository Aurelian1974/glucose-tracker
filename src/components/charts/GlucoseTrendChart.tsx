import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, LabelList,
} from 'recharts';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { GlucoseReading, AppSettings } from '@/types';
import { formatGlucose, getStatusColor, getGlucoseStatus, LOW_THRESHOLD, VERY_HIGH_THRESHOLD, CHART_COLORS } from '@/utils/glucoseUtils';

interface Props {
  readings: GlucoseReading[];
  settings: AppSettings;
  printMode?: boolean;
  height?: number;
  showAxes?: boolean;
  /** Optional upper limit reference line (stored in mmol/L) */
  limitValue?: number;
}

interface ChartPoint {
  timestamp: number;
  value: number;
  displayValue: string;
  context: string;
}

interface TooltipPayload {
  payload?: ChartPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-2">
      <div className="font-mono text-[11px] text-gt-muted">
        {format(new Date(data.timestamp), 'dd MMM, HH:mm', { locale: ro })}
      </div>
      <div className="font-mono text-sm font-bold text-gt-accent">{data.displayValue}</div>
    </div>
  );
}

export default function GlucoseTrendChart({ readings, settings, printMode = false, height = 220, showAxes = true, limitValue }: Props) {
  const chartData: ChartPoint[] = readings
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map(r => ({
      timestamp:    r.timestamp.getTime(),
      value:        settings.unit === 'mmol' ? r.value : Math.round(r.value * 18.0182),
      displayValue: formatGlucose(r.value, settings.unit) + (settings.unit === 'mmol' ? ' mmol/L' : ' mg/dL'),
      context:      r.context,
    }));

  const yLow  = settings.unit === 'mmol' ? LOW_THRESHOLD : Math.round(LOW_THRESHOLD * 18.0182);
  const yHigh = settings.unit === 'mmol' ? 10.0 : 180;
  const yVHigh = settings.unit === 'mmol' ? VERY_HIGH_THRESHOLD : Math.round(VERY_HIGH_THRESHOLD * 18.0182);

  const tickStyle = { fill: CHART_COLORS.tick, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[100px] text-gt-muted font-mono text-sm">
        Nicio dată
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: showAxes ? 5 : -40 }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2DD4BF" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        {showAxes && (
          <XAxis
            dataKey="timestamp"
            tickFormatter={ts => format(new Date(ts as number), 'dd MMM', { locale: ro })}
            tick={tickStyle}
            stroke={CHART_COLORS.grid}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.grid }}
            minTickGap={40}
          />
        )}
        {showAxes && (
          <YAxis
            tick={tickStyle}
            stroke="transparent"
            tickLine={false}
            axisLine={false}
            width={40}
          />
        )}
        {/* Limit reference line — red, shown only when limitValue is set */}
        {limitValue !== undefined && (() => {
          const yLimit = settings.unit === 'mmol' ? limitValue : Math.round(limitValue * 18.0182);
          return (
            <ReferenceLine
              y={yLimit}
              stroke="#EF4444"
              strokeWidth={1.5}
              label={{ value: String(settings.unit === 'mmol' ? yLimit.toFixed(1) : yLimit), position: 'insideTopRight', fill: '#EF4444', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
            />
          );
        })()}
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.line}
          strokeWidth={1.5}
          fill="url(#areaGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#2DD4BF', stroke: '#161B22', strokeWidth: 2 }}
          isAnimationActive={!printMode}
        >
          {/* Value labels — hidden on screen, visible in print */}
          <LabelList
            dataKey="value"
            position="top"
            offset={4}
            className="chart-print-label"
            style={{ fill: '#333', fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }}
            formatter={(v: number) => settings.unit === 'mmol' ? v.toFixed(1) : String(Math.round(v))}
          />
        </Area>
        {!printMode && <Tooltip content={<CustomTooltip />} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}
