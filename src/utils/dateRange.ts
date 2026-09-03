/**
 * Filtro de rango de fechas compartido entre Dashboard y Reportes.
 *
 * Los timestamps de las ventas se guardan en ISO/UTC (`new Date().toISOString()`),
 * pero "hoy" para un cajero es el día calendario de SU zona horaria. Por eso todo
 * acá arma los límites con los getters/setters locales de Date (getFullYear,
 * setHours, etc.), nunca con los UTC — así "hoy" coincide con lo que el cajero
 * ve en el reloj de la pared.
 */

export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export interface DateRangeValue {
  preset: DateRangePreset;
  /** Formato 'YYYY-MM-DD', tal cual lo entrega <input type="date">. Sólo se usa con preset 'custom'. */
  customStart: string;
  customEnd: string;
}

export interface DateRange {
  startMs: number;
  endMs: number;
}

export const DEFAULT_DATE_RANGE: DateRangeValue = {
  preset: 'today',
  customStart: '',
  customEnd: '',
};

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  thisMonth: 'Este mes',
  custom: 'Rango personalizado',
};

/**
 * Frases para insertar dentro de una oración. DATE_RANGE_PRESET_LABELS sirve
 * para un chip o después de un guion ("Top Productos — Últimos 7 días"), pero
 * "Sin ventas registradas Últimos 7 días" queda mal armado: falta la
 * preposición. Estas dos variantes la incluyen, para "ventas de ___" y para
 * "registradas ___" respectivamente.
 */
// Cada frase ya incluye su "de"/"del": así el llamador no arma la
// preposición por fuera y termina con "ventas de del rango..." Por eso
// custom es 'del' (contracción "de" + "el") y no "de el".
export const DATE_RANGE_PHRASE_DE: Record<DateRangePreset, string> = {
  today: 'de hoy',
  yesterday: 'de ayer',
  last7: 'de los últimos 7 días',
  last30: 'de los últimos 30 días',
  thisMonth: 'de este mes',
  custom: 'del rango seleccionado',
};

export const DATE_RANGE_PHRASE_EN: Record<DateRangePreset, string> = {
  today: 'hoy',
  yesterday: 'ayer',
  last7: 'en los últimos 7 días',
  last30: 'en los últimos 30 días',
  thisMonth: 'este mes',
  custom: 'en el rango seleccionado',
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Parsea 'YYYY-MM-DD' como medianoche LOCAL (si se le agrega 'Z' quedaría en UTC y correría el día). */
function parseLocalDateInput(value: string, fallback: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function computeDateRange(value: DateRangeValue): DateRange {
  const now = new Date();

  switch (value.preset) {
    case 'today':
      return { startMs: startOfDay(now).getTime(), endMs: endOfDay(now).getTime() };

    case 'yesterday': {
      const y = daysAgo(1);
      return { startMs: startOfDay(y).getTime(), endMs: endOfDay(y).getTime() };
    }

    case 'last7':
      // Incluye el día de hoy: 7 días en total, no 8.
      return { startMs: startOfDay(daysAgo(6)).getTime(), endMs: endOfDay(now).getTime() };

    case 'last30':
      return { startMs: startOfDay(daysAgo(29)).getTime(), endMs: endOfDay(now).getTime() };

    case 'thisMonth':
      return {
        startMs: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
        endMs: endOfDay(now).getTime(),
      };

    case 'custom': {
      const start = parseLocalDateInput(value.customStart, startOfDay(now));
      const end = parseLocalDateInput(value.customEnd, now);
      // Si cargaron el rango al revés, se corrige en vez de devolver un rango vacío.
      const [lo, hi] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
      return { startMs: startOfDay(lo).getTime(), endMs: endOfDay(hi).getTime() };
    }
  }
}

export function isTimestampInRange(isoTimestamp: string, range: DateRange): boolean {
  const t = new Date(isoTimestamp).getTime();
  return t >= range.startMs && t <= range.endMs;
}

function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

/** Etiqueta corta para mostrar en el selector, p. ej. "Hoy" o "01/09 - 03/09". */
export function formatDateRangeLabel(value: DateRangeValue, range: DateRange): string {
  if (value.preset !== 'custom') return DATE_RANGE_PRESET_LABELS[value.preset];
  return `${formatShortDate(range.startMs)} - ${formatShortDate(range.endMs)}`;
}
