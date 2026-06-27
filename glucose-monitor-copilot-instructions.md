# GlucoseTracker — Copilot & Claude Sonnet 4.6 Instructions

> **Scop**: Instrucțiuni complete pentru generarea aplicației GlucoseTracker —
> o PWA personală de monitorizare a glicemiei, fără backend, fără autentificare,
> rulând offline pe o tabletă. Toate datele sunt stocate local în IndexedDB via Dexie.js.

---

## Tech Stack

| Layer | Tehnologie | Versiune |
|---|---|---|
| Framework | React | 19.x |
| Language | TypeScript | 5.x strict |
| Build | Vite | 6.x |
| Router | React Router | v7 (createBrowserRouter) |
| Styling | Tailwind CSS | v4 |
| Database | Dexie.js | v4 |
| Charts | Recharts | 2.x |
| PWA | vite-plugin-pwa | 0.21.x |
| Icons | Lucide React | latest |
| Date | date-fns | 4.x |
| Print | react-to-print | 3.x |
| Class merge | clsx + tailwind-merge | latest |

---

## Package.json — Dependențe Exacte

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "dexie": "^4.0.0",
    "dexie-react-hooks": "^1.1.7",
    "recharts": "^2.13.0",
    "date-fns": "^4.1.0",
    "react-to-print": "^3.0.0",
    "lucide-react": "latest",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

---

## Project Structure

```
glucose-tracker/
├── public/
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── db/
│   │   └── db.ts                  # Dexie schema + singleton
│   ├── types/
│   │   └── index.ts               # Toate interfețele TypeScript
│   ├── utils/
│   │   ├── cn.ts                  # clsx + tailwind-merge helper
│   │   ├── glucoseUtils.ts        # Conversii, status, culori
│   │   └── exportUtils.ts         # CSV export
│   ├── hooks/
│   │   ├── useReadings.ts         # CRUD readings (Dexie reactive)
│   │   ├── useSettings.ts         # Settings singleton
│   │   └── useStats.ts            # Statistici derivate
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Wrapper cu header + bottom nav
│   │   │   └── BottomNav.tsx      # Navigare tabletă (4 itemi)
│   │   ├── readings/
│   │   │   ├── ReadingBadge.tsx   # Valoare + status color chip
│   │   │   └── ReadingRow.tsx     # Rând în lista History
│   │   ├── charts/
│   │   │   ├── GlucoseTrendChart.tsx   # AreaChart 30 zile
│   │   │   ├── DailyPatternChart.tsx   # BarChart medii per context
│   │   │   └── InRangeDonut.tsx        # PieChart TIR
│   │   ├── stats/
│   │   │   └── StatsPanel.tsx
│   │   └── print/
│   │       └── PrintReport.tsx    # Componentă exclusiv pentru print
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── AddReading.tsx
│   │   ├── History.tsx
│   │   ├── Charts.tsx
│   │   └── Settings.tsx
│   ├── App.tsx                    # Router setup
│   ├── main.tsx
│   └── index.css
├── vite.config.ts
├── tsconfig.json
└── .github/
    └── copilot-instructions.md    # acest fișier
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": ".",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## TypeScript Types

```typescript
// src/types/index.ts

export type GlucoseUnit = 'mmol' | 'mgdl';

export type ReadingContext =
  | 'fasting'        // À jeun / dimineața
  | 'before_meal'    // Preprandial
  | 'after_meal'     // Postprandial (2h după masă)
  | 'bedtime'        // Seara înainte de culcare
  | 'random';        // Aleatoriu / altul

export interface GlucoseReading {
  id?: number;
  value: number;        // stocat întotdeauna în mmol/L
  context: ReadingContext;
  timestamp: Date;
  notes?: string;
}

export interface TargetRange {
  context: ReadingContext;
  min: number;          // mmol/L
  max: number;          // mmol/L
}

export interface AppSettings {
  id?: number;
  unit: GlucoseUnit;    // preferința de afișare a utilizatorului
  targets: TargetRange[];
  a1cTarget: number;    // % HbA1c țintă
  reminderEnabled: boolean;
  patientName: string;  // pentru antet raport print
}

export type GlucoseStatus = 'low' | 'normal' | 'high' | 'very_high';

export interface GlucoseStats {
  avg: number;
  min: number;
  max: number;
  pctInRange: number;
  estimatedA1c: number;  // ESTIMARE, nu diagnostic clinic
  count: number;
}
```

> **IMPORTANT**: `GlucoseReading.value` se stochează **întotdeauna în mmol/L**.
> Conversia la mg/dL se face **exclusiv la afișare**, niciodată la persistare.

---

## Utility: cn()

```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

---

## Glucose Utils — Conversii și Status

```typescript
// src/utils/glucoseUtils.ts
import type { GlucoseUnit, GlucoseStatus, ReadingContext, TargetRange } from '@/types';
import { CONTEXT_LABELS } from './constants';

// --- Conversii ---
export const MMOL_TO_MGDL = 18.0182;

export function toMmol(value: number, fromUnit: GlucoseUnit): number {
  return fromUnit === 'mgdl' ? value / MMOL_TO_MGDL : value;
}

export function toMgdl(value: number, fromUnit: GlucoseUnit): number {
  return fromUnit === 'mmol' ? value * MMOL_TO_MGDL : value;
}

/** Formatează valoarea pentru afișare în unitatea preferată a utilizatorului */
export function formatGlucose(mmolValue: number, displayUnit: GlucoseUnit): string {
  if (displayUnit === 'mgdl') {
    return Math.round(mmolValue * MMOL_TO_MGDL).toString();
  }
  return mmolValue.toFixed(1);
}

export function unitLabel(unit: GlucoseUnit): string {
  return unit === 'mmol' ? 'mmol/L' : 'mg/dL';
}

// --- Validare input ---
/** Limitele de validare în mmol/L */
export const VALIDATION = {
  mmol: { min: 1.0, max: 33.3 },
  mgdl: { min: 18,  max: 600  },
};

export function validateGlucoseInput(value: number, inputUnit: GlucoseUnit): boolean {
  const limits = VALIDATION[inputUnit];
  return value >= limits.min && value <= limits.max;
}

// --- Target ranges (ADA Guidelines) ---
export const DEFAULT_TARGETS: TargetRange[] = [
  { context: 'fasting',     min: 3.9,  max: 7.2  },  // 70–130 mg/dL
  { context: 'before_meal', min: 3.9,  max: 7.2  },
  { context: 'after_meal',  min: 3.9,  max: 10.0 },  // < 180 mg/dL
  { context: 'bedtime',     min: 5.6,  max: 7.8  },  // 100–140 mg/dL
  { context: 'random',      min: 3.9,  max: 10.0 },
];

export const LOW_THRESHOLD       = 3.9;   // mmol/L (70 mg/dL)
export const VERY_HIGH_THRESHOLD = 13.9;  // mmol/L (250 mg/dL)

// --- Status ---
export function getGlucoseStatus(
  mmolValue: number,
  context: ReadingContext,
  targets: TargetRange[]
): GlucoseStatus {
  const target = targets.find(t => t.context === context) ?? DEFAULT_TARGETS[0]!;
  if (mmolValue < LOW_THRESHOLD)        return 'low';
  if (mmolValue > VERY_HIGH_THRESHOLD)  return 'very_high';
  if (mmolValue < target.min || mmolValue > target.max) return 'high';
  return 'normal';
}

/** Tailwind classes pentru status — culori web */
export function getStatusClasses(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return 'text-blue-700  bg-blue-50  border-blue-300';
    case 'normal':    return 'text-teal-700  bg-teal-50  border-teal-300';
    case 'high':      return 'text-amber-700 bg-amber-50 border-amber-300';
    case 'very_high': return 'text-red-700   bg-red-50   border-red-300';
  }
}

/** Simbol text pentru print alb-negru (nu depinde de culoare) */
export function getStatusPrintLabel(status: GlucoseStatus): string {
  switch (status) {
    case 'low':       return '▼ Scăzut';
    case 'normal':    return '✓ Normal';
    case 'high':      return '▲ Ridicat';
    case 'very_high': return '!! Foarte ridicat';
  }
}

/** Culori hex directe pentru Recharts (nu Tailwind) */
export const STATUS_COLORS: Record<GlucoseStatus, string> = {
  low:       '#3B82F6',  // blue-500
  normal:    '#14B8A6',  // teal-500
  high:      '#F59E0B',  // amber-500
  very_high: '#EF4444',  // red-500
};

export const CHART_COLORS = {
  inRange:  '#14B8A6',  // teal
  high:     '#F59E0B',  // amber
  low:      '#3B82F6',  // blue
  target:   '#CCFBF1',  // teal-100 transparent pentru ReferenceArea
  line:     '#0D9488',  // teal-600
};
```

---

## Constants

```typescript
// src/utils/constants.ts
import type { ReadingContext } from '@/types';

export const CONTEXT_LABELS: Record<ReadingContext, string> = {
  fasting:     'À jeun',
  before_meal: 'Preprandial',
  after_meal:  'Postprandial',
  bedtime:     'Seara',
  random:      'Aleatoriu',
};

export const CONTEXT_ICONS: Record<ReadingContext, string> = {
  fasting:     '🌅',
  before_meal: '🍽️',
  after_meal:  '✅',
  bedtime:     '🌙',
  random:      '⚡',
};

export const ALL_CONTEXTS: ReadingContext[] = [
  'fasting', 'before_meal', 'after_meal', 'bedtime', 'random',
];

export const DEFAULT_SETTINGS = {
  unit: 'mmol' as const,
  a1cTarget: 7.0,
  reminderEnabled: false,
  patientName: '',
};
```

---

## Dexie Database Schema

```typescript
// src/db/db.ts
import Dexie, { type Table } from 'dexie';
import type { GlucoseReading, AppSettings } from '@/types';
import { DEFAULT_TARGETS, DEFAULT_SETTINGS } from '@/utils/glucoseUtils';

export class GlucoseDB extends Dexie {
  readings!: Table<GlucoseReading>;
  settings!: Table<AppSettings>;

  constructor() {
    super('GlucoseTrackerDB');
    this.version(1).stores({
      readings: '++id, timestamp, context',
      settings: '++id',
    });
  }
}

export const db = new GlucoseDB();

/** Inițializare first-run: creează settings cu valori default dacă nu există */
export async function initializeDB(): Promise<void> {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      ...DEFAULT_SETTINGS,
      targets: DEFAULT_TARGETS,
    });
  }
}
```

---

## Structura Tabelelor (IndexedDB / Dexie)

> **Notă pentru DBA**: IndexedDB nu e relațional. Nu există JOIN, FK, sau tipuri de date stricte.
> Dexie abstractizează IndexedDB object stores ca "tabele", dar regulile sunt diferite față de SQL Server.
> Secțiunea de mai jos documentează structura ca și cum ar fi tabele, pentru claritate.

---

### Tabel: `readings`

Stochează fiecare măsurătoare de glicemie. Este singurul tabel cu volum real de date.

| Coloană | Tip JS | Indexat | Nullable | Descriere |
|---|---|---|---|---|
| `id` | `number` | ✅ PK auto-increment | NU | `++id` în Dexie — echivalent `IDENTITY(1,1)` |
| `value` | `number` | ❌ | NU | Valoare glicemie **întotdeauna în mmol/L**. Niciodată mg/dL. |
| `context` | `string` (enum) | ✅ | NU | `'fasting' \| 'before_meal' \| 'after_meal' \| 'bedtime' \| 'random'` |
| `timestamp` | `Date` | ✅ | NU | IndexedDB stochează Date nativ. Interogabil cu `.above()` / `.below()` |
| `notes` | `string` | ❌ | DA | Text liber opțional. Fără full-text index. |

**Dexie store definition:**
```
readings: '++id, timestamp, context'
```

**De ce `value` NU e indexat:**
Filtrarea după valoare (ex: "toate valorile > 10.0") se face în JS după fetch, nu prin index Dexie.
Volumul mic (~4 readings/zi × 365 zile = ~1460 rows/an) face index pe value inutil.

**De ce `context` e indexat:**
`db.readings.where('context').equals('fasting')` — query frecvent pentru Daily Pattern Chart.

**De ce `timestamp` e indexat:**
`.where('timestamp').aboveOrEqual(since)` — query primar pentru toate filtrele de perioadă (7Z, 30Z, 90Z).

**Echivalent SQL Server (pentru referință mentală):**
```sql
CREATE TABLE readings (
  id        INT           IDENTITY(1,1) PRIMARY KEY,
  value     DECIMAL(5,2)  NOT NULL,           -- mmol/L
  context   VARCHAR(20)   NOT NULL,
  timestamp DATETIME2     NOT NULL,
  notes     NVARCHAR(500) NULL,

  INDEX IX_readings_timestamp (timestamp DESC),
  INDEX IX_readings_context   (context)
);
```

**Rând de exemplu (JSON în IndexedDB):**
```json
{
  "id": 42,
  "value": 7.4,
  "context": "fasting",
  "timestamp": "2025-06-14T07:00:00.000Z",
  "notes": "după jogging seara"
}
```

**Volum estimat:**
- 4 readings/zi × 365 = ~1.460 rows/an
- 10 ani = ~14.600 rows
- IndexedDB suportă milioane de rows — nu există presiune pe performance

---

### Tabel: `settings`

Singleton — conține exact **un singur rând** cu ID = 1. Nicio altă aplicație nu are acces la el.

| Coloană | Tip JS | Indexat | Nullable | Descriere |
|---|---|---|---|---|
| `id` | `number` | ✅ PK auto-increment | NU | Întotdeauna 1 în practică |
| `unit` | `string` (enum) | ❌ | NU | `'mmol' \| 'mgdl'` — preferința de afișare |
| `targets` | `TargetRange[]` | ❌ | NU | Array JSON inline — **denormalizat** (vezi mai jos) |
| `a1cTarget` | `number` | ❌ | NU | % HbA1c țintit de utilizator (ex: 7.0) |
| `reminderEnabled` | `boolean` | ❌ | NU | Flag Web Notifications |
| `patientName` | `string` | ❌ | NU | Nume pentru header-ul raportului print |

**Dexie store definition:**
```
settings: '++id'
```
Niciun câmp indexat în afară de PK — nu există niciun query de filtrare pe settings.

**De ce `targets` e stocat inline (denormalizat), nu într-un tabel separat:**

Într-un model relațional clasic, `targets` ar fi un tabel `target_ranges(context, min, max)`.
În IndexedDB, **un JOIN costă un round-trip async** (`.get()` separat). Deoarece:
- `targets` are exact 5 rânduri fixe, rareori modificate
- E citit la fiecare calcul de status (`getGlucoseStatus`)
- Nu există niciun query de filtrare pe targets individual

→ Decizie corectă: stocat ca array JSON în același obiect cu restul settings-ului.
La fetch, întregul obiect `AppSettings` e disponibil imediat, fără query secundar.

**Echivalent SQL Server (pentru referință mentală):**
```sql
-- Ce NU facem (model relațional inutil pentru acest scop):
CREATE TABLE app_settings (
  id               INT           IDENTITY(1,1) PRIMARY KEY,
  unit             VARCHAR(10)   NOT NULL DEFAULT 'mmol',
  a1c_target       DECIMAL(4,1)  NOT NULL DEFAULT 7.0,
  reminder_enabled BIT           NOT NULL DEFAULT 0,
  patient_name     NVARCHAR(100) NOT NULL DEFAULT ''
);
CREATE TABLE target_ranges (
  context VARCHAR(20)  NOT NULL PRIMARY KEY,
  min     DECIMAL(5,2) NOT NULL,
  max     DECIMAL(5,2) NOT NULL
);

-- Ce FACEM (denormalizat, corect pentru IndexedDB):
-- Totul într-un singur obiect JSON în settings[id=1]
```

**Rând de exemplu (JSON în IndexedDB):**
```json
{
  "id": 1,
  "unit": "mmol",
  "a1cTarget": 7.0,
  "reminderEnabled": false,
  "patientName": "Aurelian",
  "targets": [
    { "context": "fasting",     "min": 3.9, "max": 7.2  },
    { "context": "before_meal", "min": 3.9, "max": 7.2  },
    { "context": "after_meal",  "min": 3.9, "max": 10.0 },
    { "context": "bedtime",     "min": 5.6, "max": 7.8  },
    { "context": "random",      "min": 3.9, "max": 10.0 }
  ]
}
```

---

### Indexuri Dexie — Sintaxă de Referință

```
++field      → autoincrement primary key
&field       → unique index
field        → non-unique index (simplu)
[f1+f2]      → compound index
*field       → multi-entry index (pentru array fields — NU folosit în această aplicație)
```

**De ce NU avem compound index `[timestamp+context]`:**
Interogările tipice sunt:
1. Toate readings după timestamp → `.where('timestamp').aboveOrEqual(since)`
2. Toate readings de tip context → `.where('context').equals('fasting')`

Nu există query de tipul "fasting readings din ultimele 30 zile" care să justifice un compound index —
filtrarea secundară se face în JS (volum mic). Dacă aplicația ar crește la sute de mii de rows,
compound index `[context+timestamp]` ar deveni relevant.

---

### Queries Dexie — Referință Rapidă

```typescript
// Toate readings, descrescător
db.readings.orderBy('timestamp').reverse().toArray()

// Ultimele N zile
const since = new Date(Date.now() - days * 86_400_000);
db.readings.where('timestamp').aboveOrEqual(since).reverse().sortBy('timestamp')

// Doar un context (ex: pentru Daily Pattern Chart)
db.readings.where('context').equals('fasting').toArray()

// Count total
db.readings.count()

// Ultimul reading
db.readings.orderBy('timestamp').last()

// Șterge un reading după id
db.readings.delete(id)

// Șterge tot (reset)
db.readings.clear()

// Bulk insert (seed data)
db.readings.bulkAdd(readingsArray)

// Update settings singleton
db.settings.update(1, { unit: 'mgdl' })

// Upsert-like (settings first-run)
const existing = await db.settings.count();
if (existing === 0) await db.settings.add(defaultSettings);
```

---

### Migrare Schema — Versioning Dexie

Dacă în v1.x se adaugă câmpuri noi, se incrementează versiunea Dexie:

```typescript
// src/db/db.ts — exemplu adăugare câmp `mealDescription` în v2
export class GlucoseDB extends Dexie {
  readings!: Table<GlucoseReading>;
  settings!: Table<AppSettings>;

  constructor() {
    super('GlucoseTrackerDB');

    // v1 — schema originală (NU se modifică niciodată)
    this.version(1).stores({
      readings: '++id, timestamp, context',
      settings: '++id',
    });

    // v2 — adăugare index nou sau câmp (câmpurile noi sunt opționale automat în IndexedDB)
    this.version(2).stores({
      readings: '++id, timestamp, context, mealDescription',
      settings: '++id',
    }).upgrade(tx => {
      // Dacă e nevoie de date migration:
      return tx.table('readings').toCollection().modify(reading => {
        reading.mealDescription = reading.mealDescription ?? null;
      });
    });
  }
}
```

**Reguli versioning:**
- Versiunile vechi din `this.version(N).stores(...)` **nu se șterg niciodată** — Dexie le folosește pentru upgrade path
- Câmpurile noi adăugate în TypeScript care nu există în store definition sunt stocate normal în IndexedDB (schema-less), dar nu pot fi indexate fără versiune nouă
- Ștergerea unui index = versiune nouă cu definița fără acel câmp
- Ștergerea unui object store (tabel) = versiune nouă + `.upgrade()` cu `tx.table('old').clear()`

---

## Hooks

### useSettings

```typescript
// src/hooks/useSettings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { AppSettings } from '@/types';
import { DEFAULT_TARGETS, DEFAULT_SETTINGS } from '@/utils/glucoseUtils';

const FALLBACK_SETTINGS: AppSettings = {
  id: 1,
  targets: DEFAULT_TARGETS,
  ...DEFAULT_SETTINGS,
};

export function useSettings(): AppSettings {
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  return settings ?? FALLBACK_SETTINGS;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const existing = await db.settings.toCollection().first();
  if (existing?.id != null) {
    await db.settings.update(existing.id, patch);
  }
}
```

### useReadings

```typescript
// src/hooks/useReadings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { GlucoseReading } from '@/types';

/** Returnează readings descrescător (cel mai recent primul).
 *  `days` = undefined → toate; `days` = 7 → ultimele 7 zile.
 *  IMPORTANT: returnează `undefined` în timpul loading-ului Dexie.
 */
export function useReadings(days?: number): GlucoseReading[] | undefined {
  return useLiveQuery(async () => {
    if (days === undefined) {
      return db.readings.orderBy('timestamp').reverse().toArray();
    }
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.readings
      .where('timestamp').aboveOrEqual(since)
      .reverse()
      .sortBy('timestamp');
  }, [days]);
}

export async function addReading(reading: Omit<GlucoseReading, 'id'>): Promise<number> {
  return db.readings.add(reading);
}

export async function deleteReading(id: number): Promise<void> {
  return db.readings.delete(id);
}

export async function deleteAllReadings(): Promise<void> {
  return db.readings.clear();
}
```

### useStats

```typescript
// src/hooks/useStats.ts
import { useMemo } from 'react';
import type { GlucoseReading, GlucoseStats, TargetRange } from '@/types';
import { getGlucoseStatus } from '@/utils/glucoseUtils';

export function useStats(
  readings: GlucoseReading[] | undefined,
  targets: TargetRange[]
): GlucoseStats | null {
  return useMemo(() => {
    if (!readings || readings.length === 0) return null;

    const values = readings.map(r => r.value);  // deja în mmol/L
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const inRangeCount = readings.filter(
      r => getGlucoseStatus(r.value, r.context, targets) === 'normal'
    ).length;

    // Formula Nathan (ADAG): eHbA1c = (avg_mmol + 2.59) / 1.59
    // ESTIMARE derivată din media valorilor — NU înlocuiește testul HbA1c clinic.
    const estimatedA1c = (avg + 2.59) / 1.59;

    return {
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      pctInRange: Math.round((inRangeCount / readings.length) * 100),
      estimatedA1c,
      count: readings.length,
    };
  }, [readings, targets]);
}
```

---

## Export CSV

```typescript
// src/utils/exportUtils.ts
import { format } from 'date-fns';
import type { GlucoseReading, GlucoseUnit } from '@/types';
import { formatGlucose, getGlucoseStatus } from './glucoseUtils';
import { CONTEXT_LABELS, DEFAULT_TARGETS } from './constants';

export function exportReadingsToCSV(readings: GlucoseReading[], displayUnit: GlucoseUnit): void {
  const headers = [
    'Data', 'Ora', 'Context',
    `Valoare (${displayUnit === 'mmol' ? 'mmol/L' : 'mg/dL'})`,
    'Status', 'Note'
  ];

  const rows = readings.map(r => {
    const status = getGlucoseStatus(r.value, r.context, DEFAULT_TARGETS);
    return [
      format(r.timestamp, 'dd.MM.yyyy'),
      format(r.timestamp, 'HH:mm'),
      CONTEXT_LABELS[r.context],
      formatGlucose(r.value, displayUnit),
      status,
      r.notes?.replace(/,/g, ';') ?? '',  // escape comma în CSV
    ].join(',');
  });

  const bom = '\uFEFF';  // BOM pentru Excel românesc
  const csv = bom + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `glicemie_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## App.tsx — Router Setup

```tsx
// src/App.tsx
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import Dashboard from '@/pages/Dashboard';
import AddReading from '@/pages/AddReading';
import History from '@/pages/History';
import Charts from '@/pages/Charts';
import Settings from '@/pages/Settings';
import { initializeDB } from '@/db/db';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/',         element: <Dashboard /> },
      { path: '/add',      element: <AddReading /> },
      { path: '/history',  element: <History /> },
      { path: '/charts',   element: <Charts /> },
      { path: '/settings', element: <Settings /> },
      { path: '*',         element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDB().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-teal-600 text-sm">Se inițializează...</div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
```

---

## AppShell & Bottom Navigation

```tsx
// src/components/layout/AppShell.tsx
import { Outlet } from 'react-router';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto">
      <main className="flex-1 overflow-y-auto pb-20 px-4 py-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
```

```tsx
// src/components/layout/BottomNav.tsx
// 4 itemi: Dashboard, Adaugă, Istoric, Grafice
// Settings se accesează dintr-un icon în header sau din Dashboard
import { NavLink } from 'react-router';
import { LayoutDashboard, Plus, History, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/add',     icon: Plus,            label: 'Adaugă' },
  { to: '/history', icon: History,         label: 'Istoric' },
  { to: '/charts',  icon: BarChart2,       label: 'Grafice' },
] as const;

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl
                    bg-white border-t border-slate-200 flex no-print">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn('flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
              isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
            )
          }
        >
          <Icon className="w-5 h-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
```

---

## Pages — Comportament Detaliat

### Dashboard (/)

- **Hero metric**: ultima valoare înregistrată, font mono 7xl, cu border color coding
- **Timp de la ultima măsurătoare**: "acum 2h" — vizibil sub valoare
- **Status badge**: text + icon (nu doar culoare — accesibil și print-friendly)
- **Mini trend chart**: AreaChart ultimele 24h, compact (height: 100px)
- **3 stats cards**: Medie 7 zile | % In Range 7 zile | Estimat HbA1c
- **Ultimele 5 readings**: ReadingRow compact
- **Link spre Settings**: icon gear în colț dreapta-sus al header-ului

### Add Reading (/add)

- Input numeric mare (text-5xl), optimizat touch, tip `inputmode="decimal"`
- Keyboard numeric pe tabletă — nu tastatura QWERTY
- Selector context: 5 butoane mari în grid 2+3 cu icon + label
- Unitate afișată conform settings (mmol/L sau mg/dL) — conversia la mmol/L la save
- Timestamp: default `new Date()`, afișat ca "Azi, 14:32", editabil (input datetime-local)
- Notes: textarea opțional, placeholder "ex: după prânz, am mâncat mai mult"
- Buton Save: mare, teal, disabled dacă valoarea nu e validă
- Validare: mmol 1.0–33.3 | mg/dL 18–600; eroare inline, nu alert()
- La succes: redirect → `/` + toast "Valoare salvată ✓"

### History (/history)

- Filtre sticky în top: perioadă (Azi | 7Z | 30Z | Tot) + context (All | dropdown)
- Sortare: descrescătoare implicit
- Fiecare rând ReadingRow: timestamp formatat | context badge | valoare + status | buton delete
- Delete: confirm dialog inline ("Ștergi această valoare?"), nu window.confirm()
- **Export CSV** button: descarcă toate readings filtrate în format `.csv` cu BOM UTF-8
- Empty state: "Nicio valoare înregistrată. Adaugă prima măsurătoare →"

### Charts (/charts)

Toate charturile au `animation={false}` când se detectează print mode.

**1. GlucoseTrendChart** — AreaChart cu:
  - XAxis: date formatate `dd MMM` via date-fns
  - YAxis: valori în unitatea din settings
  - ReferenceArea pentru zona target a contextului cel mai frecvent (verde teal-100)
  - ReferenceLine la LOW_THRESHOLD (albastru punctat) și VERY_HIGH_THRESHOLD (roșu punctat)
  - Tooltip custom: data, ora, context, valoare, status badge
  - ResponsiveContainer width="100%" height={250}
  - Selector perioadă: 7Z | 14Z | 30Z | 90Z

**2. DailyPatternChart** — BarChart cu:
  - XAxis: cele 5 contexte (CONTEXT_LABELS)
  - YAxis: media mmol/L sau mg/dL
  - Câte un Bar per context, culoare teal
  - ReferenceLine: media globală (linie punctată)
  - Tooltip: media ± SD pentru contextul respectiv
  - ErrorBar dacă datele sunt suficiente (≥ 5 readings per context)

**3. InRangeDonut** — PieChart cu:
  - 3 segmente: In Range (teal) | Ridicat (amber) | Scăzut (blue)
  - Label centru: "{pctInRange}% în țintă"
  - Legend sub chart
  - innerRadius={60} outerRadius={90}

**4. A1c Estimator Card** (nu chart, card text):
  - Formula Nathan: `eHbA1c = (avg_mmol + 2.59) / 1.59`
  - Afișat ca: "HbA1c estimat: **6.8%** (bazat pe {count} valori, ultimele 90 zile)"
  - Disclaimer obligatoriu: "⚠️ Valoare estimată — nu înlocuiește testul HbA1c de laborator."

### Settings (/settings)

- Toggle unitate (mmol/L ↔ mg/dL) — toate valorile afișate se convertesc instant
- Câmp nume pacient (pentru raport print)
- Target HbA1c% (slider + input)
- Target ranges per context: 5 rânduri cu min/max inputs
- Reset la default ADA (cu confirmare)
- **Buton Print Raport** → declanșează `useReactToPrint`
- **Buton Export JSON backup** → JSON cu toate readings + settings
- **Buton Import JSON** → restaurare din backup
- **Șterge toate datele** — confirm modal cu text de confirmare tipărit

---

## Print Support

### Pattern react-to-print

```tsx
// src/components/print/PrintReport.tsx
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
  periodLabel: string;  // ex: "01.06.2025 – 30.06.2025"
}

// forwardRef obligatoriu pentru react-to-print v3
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

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6 text-center">
            <div className="border border-slate-200 rounded p-3">
              <div className="text-2xl font-mono font-bold">
                {formatGlucose(stats.avg, settings.unit)}
              </div>
              <div className="text-xs text-slate-500">
                Medie ({settings.unit === 'mmol' ? 'mmol/L' : 'mg/dL'})
              </div>
            </div>
            <div className="border border-slate-200 rounded p-3">
              <div className="text-2xl font-mono font-bold">{stats.pctInRange}%</div>
              <div className="text-xs text-slate-500">Timp în țintă</div>
            </div>
            <div className="border border-slate-200 rounded p-3">
              <div className="text-2xl font-mono font-bold">
                {stats.estimatedA1c.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">HbA1c estimat*</div>
            </div>
            <div className="border border-slate-200 rounded p-3">
              <div className="text-2xl font-mono font-bold">{stats.count}</div>
              <div className="text-xs text-slate-500">Măsurători</div>
            </div>
          </div>
        )}

        {/* Trend Chart — animation off pentru print */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Trend</h2>
          <GlucoseTrendChart readings={readings} settings={settings} printMode={true} />
        </div>

        {/* Page break înainte de tabel */}
        <div className="print-page-break" />

        {/* Tabel readings */}
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

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400">
          * HbA1c estimat prin formula Nathan (ADAG): eA1c = (avg_mmol + 2.59) / 1.59.
          Valoarea este orientativă și nu înlocuiește testul HbA1c de laborator.
        </div>
      </div>
    );
  }
);

PrintReport.displayName = 'PrintReport';
export default PrintReport;
```

### Utilizare useReactToPrint în Settings

```tsx
// în src/pages/Settings.tsx
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import PrintReport from '@/components/print/PrintReport';

export default function Settings() {
  const printRef = useRef<HTMLDivElement>(null);
  const readings = useReadings();   // toate readings
  const settings = useSettings();
  const stats = useStats(readings, settings.targets);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Glicemie_${settings.patientName}_${format(new Date(), 'yyyy-MM')}`,
  });

  return (
    <div>
      {/* ... UI settings ... */}
      <button onClick={() => handlePrint()} className="btn-primary no-print">
        Printează Raport
      </button>

      {/* Componentă ascunsă — vizibilă doar la print */}
      <div className="hidden">
        <PrintReport
          ref={printRef}
          readings={readings ?? []}
          settings={settings}
          stats={stats}
          periodLabel="Toate înregistrările"
        />
      </div>
    </div>
  );
}
```

---

## Print CSS

```css
/* src/index.css */

@media print {
  body {
    font-size: 11pt;
    color: #000 !important;
    background: #fff !important;
  }

  /* Ascunde UI-ul aplicației la print */
  .no-print {
    display: none !important;
  }

  /* Page break manual */
  .print-page-break {
    page-break-before: always;
  }

  /* Recharts: dimensiuni fixe pentru print (ResponsiveContainer nu funcționează offline) */
  .recharts-responsive-container {
    width: 680px !important;
    height: 220px !important;
  }

  /* Override culori Tailwind pentru print alb-negru */
  [class*="text-teal"],
  [class*="text-amber"],
  [class*="text-blue"],
  [class*="text-red"] {
    color: #000 !important;
  }
}
```

---

## Design System

### Paletă

Accent ales: **Teal** (`#0D9488` / teal-600) — distinct față de sky/blue generic al app-urilor medicale standard, păstrând conotația de sănătate/precizie.

```
Background page:   #F8FAFC   (slate-50)
Surface / carduri: #FFFFFF
Border:            #E2E8F0   (slate-200)
Text principal:    #0F172A   (slate-900)
Text secundar:     #64748B   (slate-500)
Accent:            #0D9488   (teal-600) — butoane, links, active states

Status normal:     #14B8A6   (teal-500)
Status high:       #F59E0B   (amber-500)
Status low:        #3B82F6   (blue-500)
Status very_high:  #EF4444   (red-500)
```

### Tipografie

```
Hero (valori mari):  font-mono text-7xl font-bold tracking-tighter
Headings pagină:     text-xl font-semibold tracking-tight text-slate-900
Card title:          text-sm font-semibold text-slate-700
Body:                text-sm text-slate-600
Badges/labels:       text-xs font-medium uppercase tracking-wide
Timestamps:          font-mono text-xs text-slate-400
```

### Componenta ReadingBadge

```tsx
// src/components/readings/ReadingBadge.tsx
import { cn } from '@/utils/cn';
import { formatGlucose, getStatusClasses, unitLabel } from '@/utils/glucoseUtils';
import type { GlucoseStatus, GlucoseUnit } from '@/types';

interface ReadingBadgeProps {
  mmolValue: number;
  displayUnit: GlucoseUnit;
  status: GlucoseStatus;
  size?: 'sm' | 'lg';
}

export default function ReadingBadge({ mmolValue, displayUnit, status, size = 'sm' }: ReadingBadgeProps) {
  return (
    <div className={cn(
      'inline-flex items-baseline gap-1 rounded-lg border-2 font-mono font-bold',
      getStatusClasses(status),
      size === 'lg' ? 'text-6xl px-6 py-3' : 'text-base px-3 py-1'
    )}>
      {formatGlucose(mmolValue, displayUnit)}
      <span className={cn('font-normal', size === 'lg' ? 'text-lg' : 'text-xs')}>
        {unitLabel(displayUnit)}
      </span>
    </div>
  );
}
```

---

## Loading States — Pattern Obligatoriu

`useLiveQuery` returnează `undefined` în timpul primului fetch. **Orice componentă care consumă date Dexie trebuie să gestioneze loading state.**

```tsx
// Pattern skeleton — folosit consistent
function Dashboard() {
  const readings = useReadings(7);

  if (readings === undefined) {
    return <DashboardSkeleton />;
  }

  if (readings.length === 0) {
    return <EmptyState message="Nicio valoare înregistrată." actionTo="/add" />;
  }

  return <DashboardContent readings={readings} />;
}
```

Skeleton component: dreptunghiuri `bg-slate-200 animate-pulse rounded-xl`, dimensiuni care mimează layout-ul real.

---

## Coding Conventions

- **Componente**: functional, TypeScript, fără `React.FC`, cu Props interface în același fișier
- **Imports**: path aliases `@/` pentru tot, fără `../../..`
- **Dexie**: queries exclusiv în hooks, niciodată direct în componente
- **Stocare**: valoarea glicemică **întotdeauna în mmol/L** în DB; conversia mg/dL doar la afișare
- **cn()**: pentru toate class-urile condiționale
- **date-fns**: singura librărie de date; `ro` locale importat când se formatează text românesc
- **Recharts**: `animation={false}` când props `printMode={true}`, `isAnimationActive={false}` pe fiecare shape
- **Error boundaries**: câte unul per page; fallback UI cu mesaj clar, nu blank screen
- **No window.confirm()**: dialog-uri de confirmare custom (un mic modal inline)
- **Tailwind v4**: `@apply` strict interzis în componente; permis doar în `index.css` pentru `@media print`

---

## Backup / Restore JSON

```typescript
// src/utils/exportUtils.ts (adăugat)

export async function exportBackupJSON(db: GlucoseDB): Promise<void> {
  const readings = await db.readings.toArray();
  const settings = await db.settings.toCollection().first();
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    readings,
    settings,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `glucose-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBackupJSON(db: GlucoseDB, file: File): Promise<void> {
  const text = await file.text();
  const backup = JSON.parse(text);
  if (backup.version !== 1) throw new Error('Format backup necunoscut');
  await db.transaction('rw', [db.readings, db.settings], async () => {
    await db.readings.clear();
    await db.settings.clear();
    // Readings: timestamp trebuie reconvertit din string la Date
    const readings = backup.readings.map((r: GlucoseReading) => ({
      ...r,
      id: undefined,
      timestamp: new Date(r.timestamp),
    }));
    await db.readings.bulkAdd(readings);
    if (backup.settings) {
      await db.settings.add({ ...backup.settings, id: undefined });
    }
  });
}
```

---

## Date de Test (Seed Data)

### Scop

Necesar pentru testarea vizuală a tuturor componentelor: charts, liste, print, color coding, statistici.
Acoperă **30 de zile** cu **4 măsurători/zi**:

| Context | Ora tipică |
|---|---|
| `fasting` | 07:00 — à jeun, dimineața |
| `after_meal` breakfast | 09:30 — la 2h după mic dejun |
| `after_meal` lunch | 14:00 — la 2h după prânz |
| `after_meal` dinner | 21:00 — la 2h după cină |

> **NOTĂ**: contextul `before_meal` și `bedtime` nu sunt incluse în seed pentru a păstra
> datele realiste și concentrate pe pattern-ul de 4/zi. Pot fi adăugate manual pentru teste specifice.

### Distribuție Realistă pentru Diabet T2

Valorile generate trebuie să simuleze un diabetic cu control parțial (nu perfect, nu dezastruos)
pentru ca toate stările de culoare și toate zonele din charts să fie populate:

| Status | % din total | Context tipic |
|---|---|---|
| `normal` | ~40% | fasting dimineața bună, uneori after_meal |
| `high` | ~45% | after_meal frecvent, fasting ocazional |
| `very_high` | ~10% | after_meal după mese copioase, zile de stres |
| `low` | ~5% | dimineață după efort fizic sau medicație |

### Generator — src/utils/seedData.ts

```typescript
// src/utils/seedData.ts
// FOLOSIT DOAR ÎN DEVELOPMENT / TESTE — nu se include în build de producție
// Apelat din Settings cu buton "Încarcă date de test"

import { subDays, setHours, setMinutes, setSeconds } from 'date-fns';
import type { GlucoseReading, ReadingContext } from '@/types';

interface DayReading {
  context: ReadingContext;
  hour: number;
  minute: number;
  /** Medie țintă în mmol/L pentru acest slot */
  baseMean: number;
  /** Variație ±  în mmol/L (distribuție uniformă) */
  variation: number;
}

// Profilul celor 4 măsurători zilnice
const DAILY_PROFILE: DayReading[] = [
  { context: 'fasting',    hour: 7,  minute: 0,  baseMean: 7.8,  variation: 2.5 },
  { context: 'after_meal', hour: 9,  minute: 30, baseMean: 10.2, variation: 3.0 },
  { context: 'after_meal', hour: 14, minute: 0,  baseMean: 9.8,  variation: 3.5 },
  { context: 'after_meal', hour: 21, minute: 0,  baseMean: 10.5, variation: 4.0 },
];

// Variație deterministă — folosim seed bazat pe zi+slot pentru reproductibilitate
// (nu Math.random() pur — datele trebuie să fie identice la fiecare rulare pentru teste)
function seededVariation(daySeed: number, slotIndex: number, variation: number): number {
  // LCG simplu: (a * seed + c) % m
  const seed = (daySeed * 31 + slotIndex * 7) % 100;
  // Normalizat la [-1, 1]
  const normalized = (seed / 50) - 1;
  return normalized * variation;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generează readings pentru ultimele `days` zile, câte 4 pe zi.
 * Valorile sunt stocate în mmol/L (conform convenției aplicației).
 *
 * Pattern-uri speciale injectate pentru acoperire completă a testelor:
 *  - Ziua 3:  o valoare LOW (hipoglicemie dimineața)
 *  - Ziua 7:  o valoare VERY_HIGH after_meal (hiperglicemie severă)
 *  - Ziua 15: ziua cu cel mai bun control (toate în target)
 *  - Ziua 28: ziua cu cel mai slab control (toate ridicate)
 */
export function generateSeedReadings(days: number = 30): Omit<GlucoseReading, 'id'>[] {
  const readings: Omit<GlucoseReading, 'id'>[] = [];
  const today = new Date();

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset--) {
    const date = subDays(today, dayOffset);
    const dayIndex = days - 1 - dayOffset; // 0 = cel mai vechi

    DAILY_PROFILE.forEach((slot, slotIndex) => {
      let value = slot.baseMean + seededVariation(dayIndex, slotIndex, slot.variation);

      // Injectare pattern-uri speciale
      if (dayIndex === 2 && slotIndex === 0) {
        value = 3.2; // LOW — hipoglicemie dimineața zilei 3
      }
      if (dayIndex === 6 && slotIndex === 3) {
        value = 15.8; // VERY_HIGH — after dinner ziua 7
      }
      if (dayIndex === 14) {
        // Ziua 15: control bun — forțăm valori în target
        value = slotIndex === 0 ? 5.8 : 7.4 + slotIndex * 0.3;
      }
      if (dayIndex === 27) {
        // Ziua 28: control slab — forțăm valori ridicate
        value = slotIndex === 0 ? 9.5 : 12.0 + slotIndex * 0.8;
      }

      // Clamp la limite fiziologice rezonabile
      value = clamp(parseFloat(value.toFixed(1)), 2.5, 22.0);

      const timestamp = setSeconds(
        setMinutes(setHours(date, slot.hour), slot.minute + (slotIndex % 3)),
        0
      );

      readings.push({
        value,
        context: slot.context,
        timestamp,
        notes: dayIndex === 2 && slotIndex === 0
          ? 'Hipoglicemie — am mers la sală seara'
          : dayIndex === 6 && slotIndex === 3
          ? 'Cină la restaurant, mai mult decât trebuia'
          : undefined,
      });
    });
  }

  return readings;
}

/** Total readings generate: 30 zile × 4 = 120 readings */
export const SEED_READINGS_COUNT = 30 * DAILY_PROFILE.length; // 120
```

### Integrare în Settings

```tsx
// în src/pages/Settings.tsx — secțiunea "Date de Test"

import { generateSeedReadings, SEED_READINGS_COUNT } from '@/utils/seedData';
import { db } from '@/db/db';
import { useState } from 'react';

function SeedDataSection() {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleLoadSeed() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setLoading(true);
    try {
      await db.readings.clear();
      const readings = generateSeedReadings(30);
      await db.readings.bulkAdd(readings);
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
      <p className="text-sm font-semibold text-amber-800 mb-1">Date de test</p>
      <p className="text-xs text-amber-700 mb-3">
        Generează {SEED_READINGS_COUNT} valori pe 30 zile (4/zi) pentru testarea
        graficelor și listelor. <strong>Șterge toate datele existente.</strong>
      </p>
      <button
        onClick={handleLoadSeed}
        disabled={loading}
        className={cn(
          'text-sm px-4 py-2 rounded-lg font-medium transition-colors',
          confirm
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-amber-600 text-white hover:bg-amber-700',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading
          ? 'Se încarcă...'
          : confirm
          ? '⚠️ Confirmă — șterge datele existente'
          : 'Încarcă date de test'}
      </button>
      {confirm && (
        <button
          onClick={() => setConfirm(false)}
          className="ml-2 text-sm text-amber-700 underline"
        >
          Anulează
        </button>
      )}
    </div>
  );
}
```

### Ce acoperă datele de test

| Componentă | Ce testează |
|---|---|
| `ReadingBadge` | Toate 4 statusuri: `low`, `normal`, `high`, `very_high` |
| `GlucoseTrendChart` | 30 puncte de date, variație vizibilă, spike-uri |
| `DailyPatternChart` | 30 valori per context → medii stabile, ErrorBar vizibil |
| `InRangeDonut` | ~40% in range → toate 3 segmentele populate |
| `History` list | 120 rânduri, paginare/scroll, toate filtrele active |
| `StatsPanel` | Medie, min, max, % TIR, eHbA1c calculate pe date reale |
| `PrintReport` | Tabel cu 120 rânduri + charts → testează page-break |
| `Export CSV` | Fișier de ~8KB cu date și note |

---

## Roadmap

### MVP — v1.0

- [ ] Inițializare DB + Settings default
- [ ] Add Reading form (cu validare și redirect)
- [ ] Dashboard: hero metric + mini trend 24h + ultimele 5
- [ ] History: listă filtrată + delete + export CSV
- [ ] Settings: unitate + targets + patientName

### v1.1 — Charts & Print

- [ ] GlucoseTrendChart (30 zile)
- [ ] DailyPatternChart (medii per context)
- [ ] InRangeDonut (Time In Range)
- [ ] A1c Estimator Card
- [ ] PrintReport complet cu react-to-print

### v1.2 — Backup & Polish

- [ ] Export / Import JSON backup
- [ ] Dark mode (Tailwind `dark:` classes)
- [ ] Notificări reminder (Web Notifications API)
- [ ] Toast notifications (custom, fără librărie)
- [ ] Skeleton loaders pe toate paginile
