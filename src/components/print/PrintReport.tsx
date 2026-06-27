import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import type { GlucoseReading, AppSettings, GlucoseStats } from '@/types';
import { formatGlucose, getStatusPrintLabel, getGlucoseStatus } from '@/utils/glucoseUtils';
import { CONTEXT_LABELS } from '@/utils/constants';
import GlucoseTrendChart from '@/components/charts/GlucoseTrendChart';

interface PrintReportProps {
  readings: GlucoseReading[];
  settings: AppSettings;
  stats: GlucoseStats | null;
  periodLabel: string;
}

const PrintReport = forwardRef<HTMLDivElement, PrintReportProps>(
  ({ readings, settings, stats, periodLabel }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white text-slate-900 font-sans">
        {/* Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold">Raport Monitorizare Glicemie</h1>
          {settings.patientName && (
            <p className="text-lg mt-1">{settings.patientName}</p>
          )}
          <p className="text-sm text-slate-600 mt-1">Perioadă: {periodLabel}</p>
          <p className="text-xs text-slate-400 mt-1">
            Generat de GlucoseTracker pe {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: ro })}
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6 text-center">
            {[
              { value: formatGlucose(stats.avg, settings.unit), label: `Medie (${settings.unit === 'mmol' ? 'mmol/L' : 'mg/dL'})` },
              { value: `${stats.pctInRange}%`, label: 'Timp în țintă' },
              { value: `${stats.estimatedA1c.toFixed(1)}%`, label: 'HbA1c estimat*' },
              { value: String(stats.count), label: 'Măsurători' },
            ].map(({ value, label }) => (
              <div key={label} className="border border-slate-200 rounded p-3">
                <div className="text-2xl font-mono font-bold">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Trend</h2>
          <GlucoseTrendChart readings={readings} settings={settings} printMode={true} />
        </div>

        <div className="print-page-break" />

        {/* Readings table */}
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3">
          Toate valorile ({readings.length})
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="text-left py-2 pr-4">Data</th>
              <th className="text-left py-2 pr-4">Ora</th>
              <th className="text-left py-2 pr-4">Context</th>
              <th className="text-right py-2 pr-4">
                Valoare ({settings.unit === 'mmol' ? 'mmol/L' : 'mg/dL'})
              </th>
              <th className="text-left py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r, i) => {
              const status = getGlucoseStatus(r.value, r.context, settings.targets);
              return (
                <tr key={r.id ?? i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-1.5 pr-4">{format(r.timestamp, 'dd.MM.yyyy')}</td>
                  <td className="py-1.5 pr-4">{format(r.timestamp, 'HH:mm')}</td>
                  <td className="py-1.5 pr-4">{CONTEXT_LABELS[r.context]}</td>
                  <td className="py-1.5 pr-4 text-right font-mono font-bold">
                    {formatGlucose(r.value, settings.unit)}
                  </td>
                  <td className="py-1.5 text-xs">{getStatusPrintLabel(status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400">
          * HbA1c estimat prin formula Nathan (ADAG): eA1c = (avg_mmol + 2.59) / 1.59. Valoarea este orientativă.
        </div>
      </div>
    );
  },
);

PrintReport.displayName = 'PrintReport';
export default PrintReport;
