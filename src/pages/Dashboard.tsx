import { useMemo } from 'react';
import { Link } from 'react-router';
import { Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { useReadings } from '@/hooks/useReadings';
import { useSettings } from '@/hooks/useSettings';
import { useStats } from '@/hooks/useStats';
import StatsPanel from '@/components/stats/StatsPanel';
import GlucoseTrendChart from '@/components/charts/GlucoseTrendChart';
import {
  formatGlucose, getGlucoseStatus, getStatusColor,
  getStatusLabel, formatTimeAgo, unitLabel,
} from '@/utils/glucoseUtils';
import { CONTEXT_LABELS, CONTEXT_SHORT_LABELS } from '@/utils/constants';
import type { GlucoseReading } from '@/types';

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-0">
      <div className="h-10 bg-gt-surface border-b border-gt-border" />
      <div className="h-[180px] bg-gt-surface border-b border-gt-border" />
      <div className="h-[72px] bg-gt-surface border-b border-gt-border" />
      <div className="h-[96px] bg-gt-surface border-b border-gt-border" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[52px] bg-gt-surface border-b border-gt-border" />
      ))}
    </div>
  );
}

function RecentRow({ reading, unit, targets }: { reading: GlucoseReading; unit: ReturnType<typeof useSettings>['unit']; targets: ReturnType<typeof useSettings>['targets'] }) {
  const status = getGlucoseStatus(reading.value, reading.context, targets);
  const color  = getStatusColor(status);

  const today     = new Date();
  const isToday   = format(reading.timestamp, 'yyyyMMdd') === format(today, 'yyyyMMdd');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = format(reading.timestamp, 'yyyyMMdd') === format(yesterday, 'yyyyMMdd');

  const dateLabel = isToday ? 'azi' : isYesterday ? 'ieri' : format(reading.timestamp, 'dd MMM', { locale: ro });

  return (
    <div className="flex items-center h-[52px] px-4 border-b border-gt-border last:border-b-0">
      {/* Time + date */}
      <div className="w-16 flex-shrink-0">
        <div className="font-mono text-sm text-gt-text">{format(reading.timestamp, 'HH:mm')}</div>
        <div className="font-mono text-[11px] text-gt-muted">{dateLabel}</div>
      </div>

      {/* Context badge */}
      <div className="flex-1 flex justify-center">
        <span
          className="font-mono text-[10px] border rounded-[4px] px-1.5 py-0.5 text-gt-secondary border-gt-border"
        >
          {CONTEXT_SHORT_LABELS[reading.context]}
        </span>
      </div>

      {/* Value */}
      <div className="text-right">
        <span className="font-mono text-lg font-bold" style={{ color }}>
          {formatGlucose(reading.value, unit)}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const allReadings = useReadings();
  const settings    = useSettings();

  const readings7d = useMemo(() => {
    if (!allReadings) return undefined;
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allReadings.filter(r => r.timestamp.getTime() >= since);
  }, [allReadings]);

  const readings24h = useMemo(() => {
    if (!allReadings) return undefined;
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return allReadings.filter(r => r.timestamp.getTime() >= since);
  }, [allReadings]);

  const recentReadings = useMemo(() => allReadings?.slice(0, 5), [allReadings]);
  const lastReading    = allReadings?.at(0);
  const stats          = useStats(readings7d, settings.targets);

  if (allReadings === undefined) return <DashboardSkeleton />;

  const status       = lastReading ? getGlucoseStatus(lastReading.value, lastReading.context, settings.targets) : 'normal';
  const statusColor  = getStatusColor(status);

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-gt-border">
        <span className="font-mono text-[13px] text-gt-muted tracking-[0.08em]">GLUCOSE</span>
        <Link to="/settings" className="text-gt-secondary hover:text-gt-text transition-colors">
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Hero section */}
      {lastReading ? (
        <div
          className="bg-gt-surface border-b border-gt-border flex items-center px-6 relative"
          style={{ height: '180px', borderLeft: `4px solid ${statusColor}` }}
        >
          {/* Value + unit + context + time */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-gt-text" style={{ fontSize: '80px', lineHeight: 1 }}>
                {formatGlucose(lastReading.value, settings.unit)}
              </span>
              <span className="font-mono text-sm text-gt-secondary self-end pb-3">
                {unitLabel(settings.unit)}
              </span>
            </div>
            <div className="font-sans text-[11px] uppercase tracking-[0.1em] text-gt-muted mt-1">
              {CONTEXT_LABELS[lastReading.context]}
            </div>
            <div className="font-mono text-[11px] text-gt-muted mt-0.5">
              {formatTimeAgo(lastReading.timestamp)}
            </div>
          </div>

          {/* Status badge */}
          <div
            className="rounded-full px-3 py-1 font-mono text-[11px] font-bold border"
            style={{ color: statusColor, borderColor: statusColor, backgroundColor: `${statusColor}18` }}
          >
            {getStatusLabel(status)}
          </div>
        </div>
      ) : (
        <div className="bg-gt-surface border-b border-gt-border h-[180px] flex flex-col items-center justify-center gap-2">
          <span className="font-mono text-lg text-gt-muted">--.-</span>
          <span className="font-sans text-[11px] uppercase tracking-[0.1em] text-gt-muted">Nicio valoare</span>
          <Link to="/add" className="font-mono text-[12px] text-gt-accent mt-2">→ Adaugă prima măsurătoare</Link>
        </div>
      )}

      {/* Stats row */}
      {stats ? (
        <StatsPanel stats={stats} unit={settings.unit} />
      ) : (
        <div className="h-[72px] border-b border-gt-border flex items-center justify-center">
          <span className="font-mono text-[11px] text-gt-muted">Date insuficiente (7 zile)</span>
        </div>
      )}

      {/* Mini trend 24h */}
      <div className="px-0 pt-3 pb-0 border-b border-gt-border">
        <div className="px-4 mb-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans">
            Ultimele 24h
          </span>
        </div>
        <div className="bg-gt-surface px-0">
          {readings24h && readings24h.length > 0 ? (
            <GlucoseTrendChart
              readings={readings24h}
              settings={settings}
              height={80}
              showAxes={false}
            />
          ) : (
            <div className="h-[80px] flex items-center justify-center">
              <span className="font-mono text-[11px] text-gt-muted">Nicio valoare în ultimele 24h</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent readings */}
      <div className="pt-3">
        <div className="px-4 mb-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans">
            Recent
          </span>
        </div>
        <div className="bg-gt-surface border-t border-gt-border">
          {recentReadings && recentReadings.length > 0 ? (
            recentReadings.map(r => (
              <RecentRow key={r.id} reading={r} unit={settings.unit} targets={settings.targets} />
            ))
          ) : (
            <div className="h-[52px] flex items-center justify-center">
              <span className="font-mono text-[11px] text-gt-muted">Nicio valoare înregistrată</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
