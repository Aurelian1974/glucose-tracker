import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { addReading } from '@/hooks/useReadings';
import { useSettings } from '@/hooks/useSettings';
import { toMmol, validateGlucoseInput, VALIDATION } from '@/utils/glucoseUtils';
import { localNow } from '@/utils/localTime';
import type { ReadingContext, GlucoseUnit } from '@/types';
import { cn } from '@/utils/cn';

// UI slots — mirror the History table columns
interface UISlot {
  id: string;
  label: string;
  icon: string;
  context: ReadingContext;
  suggestHour?: number;
  suggestMin?: number;
}

const UI_SLOTS: UISlot[] = [
  { id: 'fasting',    label: 'À jeun',         icon: '🌅', context: 'fasting',    suggestHour: 7,  suggestMin: 0  },
  { id: 'post_md',    label: 'Post mic-dejun',  icon: '☕', context: 'after_meal', suggestHour: 9,  suggestMin: 30 },
  { id: 'post_pz',    label: 'Post prânz',      icon: '🍽️', context: 'after_meal', suggestHour: 14, suggestMin: 0  },
  { id: 'post_cn',    label: 'Post cină',       icon: '🍷', context: 'after_meal', suggestHour: 21, suggestMin: 0  },
  { id: 'bedtime',    label: 'Seara',           icon: '🌙', context: 'bedtime',    suggestHour: 22, suggestMin: 0  },
  { id: 'random',     label: 'Aleatoriu',       icon: '⚡', context: 'random' },
];

/** Format a local Date to the datetime-local input value string */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offsetMs = -d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() + offsetMs).toISOString().slice(0, 16);
}


export default function AddReading() {
  const navigate  = useNavigate();
  const settings  = useSettings();

  const [valueStr, setValueStr]   = useState('');
  const [unit, setUnit]           = useState<GlucoseUnit>(settings.unit);
  const [slotId, setSlotId]       = useState<string>('fasting');
  const [context, setContext]     = useState<ReadingContext>('fasting');
  const [timestamp, setTimestamp] = useState<string>(localNow);

  // Refresh to current local time on every mount
  useEffect(() => { setTimestamp(localNow()); }, []);

  function selectSlot(slot: UISlot) {
    setSlotId(slot.id);
    setContext(slot.context);
    if (slot.suggestHour !== undefined) {
      // Apply suggested time to today's date
      const base = new Date();
      base.setHours(slot.suggestHour, slot.suggestMin ?? 0, 0, 0);
      setTimestamp(toLocalInputValue(base));
    }
  }
  const [notes, setNotes]         = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const numValue   = parseFloat(valueStr);
  const isValidNum = !isNaN(numValue) && isFinite(numValue);
  const isValid    = isValidNum && validateGlucoseInput(numValue, unit);

  const limits = VALIDATION[unit];

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      const mmolValue = toMmol(numValue, unit);
      await addReading({
        value:     mmolValue,
        context,
        timestamp: new Date(timestamp),
        notes:     notes.trim() || undefined,
      });
      navigate('/');
    } catch {
      setError('Eroare la salvare. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  }

  const contextGrid1 = UI_SLOTS.slice(0, 3);
  const contextGrid2 = UI_SLOTS.slice(3);

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 h-12 px-4 border-b border-gt-border bg-gt-surface sticky top-0">
        <button
          onClick={() => navigate(-1)}
          className="text-gt-secondary hover:text-gt-text transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-sans text-[13px] uppercase tracking-[0.08em] text-gt-secondary font-medium">
          Adaugă valoare
        </span>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Value input section */}
        <div className="bg-gt-surface border border-gt-border rounded-[4px] px-6 py-6 text-center">
          <input
            type="number"
            inputMode="decimal"
            placeholder="--.-"
            value={valueStr}
            onChange={e => { setValueStr(e.target.value); setError(''); }}
            className={cn(
              'w-full text-center font-mono font-bold bg-transparent outline-none caret-gt-accent',
              'placeholder-gt-muted border-b-2 pb-2 transition-colors',
              valueStr && !isValid ? 'text-gt-very-high border-gt-very-high' : 'text-gt-text border-gt-border focus:border-gt-accent',
            )}
            style={{ fontSize: '72px', lineHeight: 1 }}
          />

          {/* Unit toggle */}
          <div className="flex justify-center gap-8 mt-4">
            {(['mmol', 'mgdl'] as GlucoseUnit[]).map(u => (
              <button
                key={u}
                onClick={() => {
                  setUnit(u);
                  setValueStr('');
                  setError('');
                }}
                className={cn(
                  'font-mono text-sm pb-1 transition-colors border-b-2',
                  unit === u
                    ? 'text-gt-accent border-gt-accent'
                    : 'text-gt-secondary border-transparent hover:text-gt-text',
                )}
              >
                {u === 'mmol' ? 'mmol/L' : 'mg/dL'}
              </button>
            ))}
          </div>

          {/* Validation range */}
          <p className="font-mono text-[11px] text-gt-muted mt-3">
            {unit === 'mmol' ? `${limits.min.toFixed(1)} – ${limits.max.toFixed(1)}` : `${limits.min} – ${limits.max}`}
            {' '}{unit === 'mmol' ? 'mmol/L' : 'mg/dL'}
          </p>

          {error && (
            <p className="font-mono text-[11px] text-gt-very-high mt-2">{error}</p>
          )}
        </div>

        {/* Context selector */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-3">
            Context măsurătoare
          </p>
          <div className="grid grid-cols-3 gap-2">
            {contextGrid1.map(slot => (
              <SlotButton
                key={slot.id}
                slot={slot}
                active={slotId === slot.id}
                onClick={() => selectSlot(slot)}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {contextGrid2.map(slot => (
              <SlotButton
                key={slot.id}
                slot={slot}
                active={slotId === slot.id}
                onClick={() => selectSlot(slot)}
              />
            ))}
          </div>
        </div>

        {/* Timestamp */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-gt-muted font-sans mb-2">
            Timestamp
          </p>
          <input
            type="datetime-local"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
            className="w-full bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-2 font-mono text-sm text-gt-text focus:outline-none focus:border-gt-accent transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          {notesOpen ? (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="ex: după prânz, am mâncat mai mult..."
              rows={3}
              className="w-full bg-gt-elevated border border-gt-border rounded-[4px] px-3 py-2 font-sans text-sm text-gt-text placeholder-gt-muted focus:outline-none focus:border-gt-accent transition-colors resize-none"
            />
          ) : (
            <button
              onClick={() => setNotesOpen(true)}
              className="font-mono text-[13px] text-gt-accent hover:text-gt-text transition-colors"
            >
              + Adaugă notă
            </button>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="px-4 pb-6 pt-2">
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className={cn(
            'w-full h-[52px] rounded-[4px] font-mono text-sm font-bold tracking-[0.06em] transition-all',
            isValid && !saving
              ? 'bg-gt-accent text-gt-bg hover:bg-[#26BCA8]'
              : 'bg-transparent border border-gt-accent text-gt-accent opacity-40 cursor-not-allowed',
          )}
        >
          {saving ? 'SE SALVEAZĂ...' : 'SALVEAZĂ'}
        </button>
      </div>
    </div>
  );
}

function SlotButton({
  slot, active, onClick,
}: { slot: UISlot; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-3 px-2 rounded-[4px] border transition-all',
        active
          ? 'border-gt-accent text-gt-accent bg-gt-elevated'
          : 'border-gt-border text-gt-secondary bg-gt-elevated hover:border-gt-border-strong hover:text-gt-text',
      )}
    >
      <span className="text-xl">{slot.icon}</span>
      <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] leading-tight text-center">
        {slot.label}
      </span>
    </button>
  );
}
