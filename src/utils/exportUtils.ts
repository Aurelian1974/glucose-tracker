import { format } from 'date-fns';
import type { GlucoseReading, GlucoseUnit } from '@/types';
import { formatGlucose, getGlucoseStatus, getStatusPrintLabel } from './glucoseUtils';
import { CONTEXT_LABELS, DEFAULT_SETTINGS } from './constants';
import { DEFAULT_TARGETS } from './glucoseUtils';
import type { GlucoseDB } from '@/db/db';

export function exportReadingsToCSV(readings: GlucoseReading[], displayUnit: GlucoseUnit): void {
  const headers = [
    'Data', 'Ora', 'Context',
    `Valoare (${displayUnit === 'mmol' ? 'mmol/L' : 'mg/dL'})`,
    'Status', 'Note',
  ];

  const rows = readings.map(r => {
    const status = getGlucoseStatus(r.value, r.context, DEFAULT_TARGETS);
    return [
      format(r.timestamp, 'dd.MM.yyyy'),
      format(r.timestamp, 'HH:mm'),
      CONTEXT_LABELS[r.context],
      formatGlucose(r.value, displayUnit),
      getStatusPrintLabel(status),
      (r.notes ?? '').replace(/,/g, ';'),
    ].join(',');
  });

  const bom = '\uFEFF';
  const csv = bom + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glicemie_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportBackupJSON(db: GlucoseDB): Promise<void> {
  const readings = await db.readings.toArray();
  const settings = await db.settings.toCollection().first();
  const backup = { version: 1, exportedAt: new Date().toISOString(), readings, settings };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glucose-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackupJSON(db: GlucoseDB, file: File): Promise<void> {
  const text = await file.text();
  const backup = JSON.parse(text) as {
    version: number;
    readings: GlucoseReading[];
    settings?: typeof DEFAULT_SETTINGS;
  };
  if (backup.version !== 1) throw new Error('Format backup necunoscut');
  await db.transaction('rw', [db.readings, db.settings], async () => {
    await db.readings.clear();
    await db.settings.clear();
    const readings = backup.readings.map(r => ({
      ...r,
      id: undefined,
      timestamp: new Date(r.timestamp),
    }));
    await db.readings.bulkAdd(readings);
    if (backup.settings) {
      await db.settings.add({ ...backup.settings, id: undefined, targets: DEFAULT_TARGETS });
    }
  });
}
