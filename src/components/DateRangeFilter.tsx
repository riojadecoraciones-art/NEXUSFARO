import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import {
  DateRangePreset,
  DateRangeValue,
  DateRange,
  DATE_RANGE_PRESET_LABELS,
  computeDateRange,
  formatDateRangeLabel,
} from '../utils/dateRange';

const PRESETS: DateRangePreset[] = ['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'custom'];

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

/** Selector de período: reemplaza el chip fijo "Hoy" por un filtro real, compartido entre Dashboard y Reportes. */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const range: DateRange = computeDateRange(value);
  const label = formatDateRangeLabel(value, range);

  const selectPreset = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({ ...value, preset: 'custom' });
      return; // se queda abierto para que carguen las fechas
    }
    onChange({ preset, customStart: '', customEnd: '' });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl shadow-xs transition-colors"
      >
        <Calendar className="w-4 h-4 text-slate-500" />
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-lg z-30 p-2 animate-in fade-in zoom-in-95 duration-100">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                value.preset === preset ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{DATE_RANGE_PRESET_LABELS[preset]}</span>
              {value.preset === preset && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}

          {value.preset === 'custom' && (
            <div className="mt-1.5 pt-2 border-t border-slate-100 px-1 space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={value.customStart}
                  max={value.customEnd || undefined}
                  onChange={(e) => onChange({ ...value, customStart: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={value.customEnd}
                  min={value.customStart || undefined}
                  onChange={(e) => onChange({ ...value, customEnd: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={!value.customStart || !value.customEnd}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] transition-colors mt-1"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
