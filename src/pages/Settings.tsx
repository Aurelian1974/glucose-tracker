import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { useSettings, updateSettings } from '@/hooks/useSettings';
import { useReadings, deleteAllReadings } from '@/hooks/useReadings';
import { DEFAULT_FASTING_LIMIT_MMOL, DEFAULT_POSTPRANDIAL_LIMIT_MMOL } from '@/utils/constants';
import { useStats } from '@/hooks/useStats';
import { exportBackupJSON, importBackupJSON } from '@/utils/exportUtils';
import { generateSeedReadings, SEED_READINGS_COUNT } from '@/utils/seedData';
import { DEFAULT_TARGETS, MMOL_TO_MGDL } from '@/utils/glucoseUtils';
import PrintReport from '@/components/print/PrintReport';
import { db } from '@/db/db';
import { cn } from '@/utils/cn';
import type { GlucoseUnit } from '@/types';

export default function Settings() {
  const settings    = useSettings();
  const allReadings = useReadings();
  const stats       = useStats(allReadings, settings.targets);
  const printRef    = useRef<HTMLDivElement>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [seedConfirm,   setSeedConfirm]   = useState(false);
  const [seedLoading,   setSeedLoading]   = useState(false);
  const [importError,   setImportError]   = useState('');
  const [saved,         setSaved]         = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Glicemie_${settings.patientName || 'raport'}_${format(new Date(), 'yyyy-MM')}`,
  });

  async function handleDeleteAll() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    await deleteAllReadings();
    setDeleteConfirm(false);
  }

  async function handleSeed() {
    if (!seedConfirm) { setSeedConfirm(true); return; }
    setSeedLoading(true);
    try {
      await db.readings.clear();
      await db.readings.bulkAdd(generateSeedReadings(30));
    } finally {
      setSeedLoading(false);
      setSeedConfirm(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    try {
      await importBackupJSON(db, file);
    } catch {
      setImportError('Fișier invalid sau format necunoscut.');
    }
  }

  function patch<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    updateSettings({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const row    = 'flex items-center justify-between py-3 border-b border-gt-border';
  const label  = 'font-sans text-sm text-gt-text';
  const label2 = 'font-mono text-[11px] text-gt-muted';
  const section = 'text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-3 mt-6';
  const dangerBtn = 'font-mono text-[12px] px-3 py-1.5 rounded-[4px] border transition-colors';

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-sans text-[13px] uppercase tracking-[0.08em] text-gt-secondary font-medium">
          Setări
        </h1>
        {saved && (
          <span className="font-mono text-[11px] text-gt-accent animate-pulse">✓ Salvat</span>
        )}
      </div>

      {/* Display unit */}
      <p className={section}>Unitate de măsură</p>
      <div className="bg-gt-surface border border-gt-border rounded-[4px] p-1 flex gap-1">
        {(['mmol', 'mgdl'] as GlucoseUnit[]).map(u => (
          <button
            key={u}
            onClick={() => patch('unit', u)}
            className={cn(
              'flex-1 py-2 rounded-[2px] font-mono text-sm font-bold transition-all',
              settings.unit === u
                ? 'bg-gt-accent text-gt-bg'
                : 'text-gt-secondary hover:text-gt-text',
            )}
          >
            {u === 'mmol' ? 'mmol/L' : 'mg/dL'}
          </button>
        ))}
      </div>

      {/* Patient name */}
      <p className={section}>Profil</p>
      <div className={row}>
        <span className={label}>Nume pacient</span>
        <input
          type="text"
          value={settings.patientName}
          onChange={e => patch('patientName', e.target.value)}
          placeholder="Opțional (pentru raport)"
          className="bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-1.5 font-sans text-sm text-gt-text placeholder-gt-muted focus:outline-none focus:border-gt-accent w-48 text-right"
        />
      </div>

      <div className={row}>
        <span className={label}>Țintă HbA1c</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="4"
            max="12"
            value={settings.a1cTarget}
            onChange={e => patch('a1cTarget', parseFloat(e.target.value) || settings.a1cTarget)}
            className="bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-1.5 font-mono text-sm text-gt-text focus:outline-none focus:border-gt-accent w-20 text-center"
          />
          <span className={label2}>%</span>
        </div>
      </div>

      {/* Glucose limits */}
      <p className={section}>Limite glicemie</p>
      <div className="bg-gt-surface border border-gt-border rounded-[4px] overflow-hidden">
        {[
          {
            label: 'À jeun',
            key: 'fastingLimit' as const,
            valueMmol: settings.fastingLimit ?? DEFAULT_FASTING_LIMIT_MMOL,
          },
          {
            label: 'Postprandial',
            key: 'postprandialLimit' as const,
            valueMmol: settings.postprandialLimit ?? DEFAULT_POSTPRANDIAL_LIMIT_MMOL,
          },
        ].map(({ label, key, valueMmol }, i) => {
          const displayVal = settings.unit === 'mgdl'
            ? Math.round(valueMmol * MMOL_TO_MGDL)
            : parseFloat(valueMmol.toFixed(1));
          return (
            <div
              key={key}
              className={cn(
                'flex items-center px-4 py-2.5 gap-3',
                i === 0 && 'border-b border-gt-border',
              )}
            >
              <span className="font-sans text-sm text-gt-secondary flex-1">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step={settings.unit === 'mgdl' ? '1' : '0.1'}
                  value={displayVal}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (isNaN(v)) return;
                    const mmol = settings.unit === 'mgdl' ? v / MMOL_TO_MGDL : v;
                    patch(key, mmol);
                  }}
                  className="bg-gt-elevated border border-gt-border rounded-[4px] px-2 py-1 font-mono text-sm text-gt-text focus:outline-none focus:border-gt-accent w-20 text-center"
                />
                <span className="font-mono text-[11px] text-gt-muted">
                  {settings.unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <p className={section}>Export / Import</p>
      <div className="space-y-2">
        <button
          onClick={() => handlePrint()}
          className={cn(dangerBtn, 'w-full border-gt-border text-gt-secondary hover:border-gt-accent hover:text-gt-accent')}
        >
          🖨 Printează raport
        </button>
        <button
          onClick={() => exportBackupJSON(db)}
          className={cn(dangerBtn, 'w-full border-gt-border text-gt-secondary hover:border-gt-accent hover:text-gt-accent')}
        >
          ↓ Export JSON backup
        </button>
        <label className={cn(dangerBtn, 'w-full border-gt-border text-gt-secondary hover:border-gt-accent hover:text-gt-accent cursor-pointer text-center block')}>
          ↑ Import JSON backup
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
        {importError && (
          <p className="font-mono text-[11px] text-gt-very-high">{importError}</p>
        )}
      </div>

      {/* Seed data */}
      <p className={section}>Date de test</p>
      <div className="bg-gt-surface border border-gt-high rounded-[4px] p-4">
        <p className="font-sans text-sm text-gt-high mb-1">Date de test</p>
        <p className="font-mono text-[11px] text-gt-muted mb-3">
          Generează {SEED_READINGS_COUNT} valori pe 30 de zile. Șterge toate datele existente.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className={cn(
              dangerBtn,
              seedConfirm
                ? 'border-gt-very-high text-gt-very-high hover:bg-gt-very-high hover:text-gt-bg'
                : 'border-gt-high text-gt-high hover:bg-gt-high hover:text-gt-bg',
              seedLoading && 'opacity-50 cursor-not-allowed',
            )}
          >
            {seedLoading ? 'Se încarcă...' : seedConfirm ? '⚠ Confirmă' : 'Încarcă date test'}
          </button>
          {seedConfirm && (
            <button
              onClick={() => setSeedConfirm(false)}
              className="font-mono text-[12px] text-gt-muted hover:text-gt-secondary"
            >
              Anulează
            </button>
          )}
        </div>
      </div>

      {/* Reset targets */}
      <p className={section}>Resetare</p>
      <button
        onClick={() => patch('fastingLimit', DEFAULT_FASTING_LIMIT_MMOL)}
        className={cn(dangerBtn, 'border-gt-border text-gt-muted hover:border-gt-border-strong hover:text-gt-secondary mr-2')}
      >
        Reset À jeun (120)
      </button>
      <button
        onClick={() => patch('postprandialLimit', DEFAULT_POSTPRANDIAL_LIMIT_MMOL)}
        className={cn(dangerBtn, 'border-gt-border text-gt-muted hover:border-gt-border-strong hover:text-gt-secondary')}
      >
        Reset postprandial (160)
      </button>

      {/* Delete all */}
      <div className="mt-4">
        <div className="flex gap-2 items-center">
          <button
            onClick={handleDeleteAll}
            className={cn(
              dangerBtn,
              deleteConfirm
                ? 'border-gt-very-high text-gt-very-high'
                : 'border-gt-border text-gt-muted hover:border-gt-very-high hover:text-gt-very-high',
            )}
          >
            {deleteConfirm ? '⚠ Confirmă ștergerea' : 'Șterge toate datele'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="font-mono text-[12px] text-gt-muted hover:text-gt-secondary"
            >
              Anulează
            </button>
          )}
        </div>
      </div>

      {/* Hidden print component */}
      <div className="hidden">
        <PrintReport
          ref={printRef}
          readings={allReadings ?? []}
          settings={settings}
          stats={stats}
          periodLabel="Toate înregistrările"
        />
      </div>
    </div>
  );
}
