import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Lightbulb, Trash2 } from 'lucide-react';
import { ContentIdea, ContentIdeaType, CONTENT_IDEA_TYPE_LABELS } from '../types';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TYPE_STYLES: Record<ContentIdeaType, { chip: string; dot: string; pillActive: string; textOnly: string }> = {
  PROMOCION: {
    chip: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    dot: 'bg-emerald-600',
    pillActive: 'bg-emerald-600 text-white border-emerald-600',
    textOnly: 'text-emerald-700',
  },
  PUBLICACION: {
    chip: 'bg-blue-50 border-blue-200 text-blue-700',
    dot: 'bg-blue-600',
    pillActive: 'bg-blue-600 text-white border-blue-600',
    textOnly: 'text-blue-700',
  },
  HISTORIA: {
    chip: 'bg-purple-50 border-purple-200 text-purple-700',
    dot: 'bg-purple-600',
    pillActive: 'bg-purple-600 text-white border-purple-600',
    textOnly: 'text-purple-700',
  },
  RECORDATORIO: {
    chip: 'bg-amber-50 border-amber-200 text-amber-700',
    dot: 'bg-amber-600',
    pillActive: 'bg-amber-600 text-white border-amber-600',
    textOnly: 'text-amber-700',
  },
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Grilla Lunes-a-Domingo del mes, con los días sobrantes del mes anterior/siguiente para completar semanas. 5 filas salvo que el mes necesite una 6ta. */
function getMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Lun..6=Dom
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  const needsSixthRow = days[35].getMonth() === month;
  return needsSixthRow ? days : days.slice(0, 35);
}

export const ContentCalendarView: React.FC = () => {
  const { contentIdeas, addContentIdea, updateContentIdea, deleteContentIdea } = useApp();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ContentIdea | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ContentIdeaType>('PUBLICACION');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const todayKey = toDateKey(new Date());
  const days = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const monthLabel = `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const gridRows = days.length / 7;

  const byDate = useMemo(() => {
    const map: Record<string, ContentIdea[]> = {};
    contentIdeas.forEach((idea) => {
      if (!idea.scheduledDate) return;
      (map[idea.scheduledDate] ||= []).push(idea);
    });
    return map;
  }, [contentIdeas]);

  const ideaBank = useMemo(() => contentIdeas.filter((i) => !i.scheduledDate), [contentIdeas]);

  const openNewModal = (presetDate?: string) => {
    setEditingIdea(null);
    setFormTitle('');
    setFormType('PUBLICACION');
    setFormDate(presetDate || '');
    setFormNotes('');
    setConfirmingDelete(false);
    setIsModalOpen(true);
  };

  const openEditModal = (idea: ContentIdea) => {
    setEditingIdea(idea);
    setFormTitle(idea.title);
    setFormType(idea.type);
    setFormDate(idea.scheduledDate || '');
    setFormNotes(idea.notes || '');
    setConfirmingDelete(false);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle.trim(),
      type: formType,
      scheduledDate: formDate || undefined,
      notes: formNotes.trim() || undefined,
    };

    if (editingIdea) {
      await updateContentIdea(editingIdea.id, payload);
    } else {
      await addContentIdea(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!editingIdea) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    const ok = await deleteContentIdea(editingIdea.id);
    if (ok) setIsModalOpen(false);
  };

  const goToday = () => {
    const d = new Date();
    setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const goPrevMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goNextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="flex-1 p-6 sm:p-8 bg-[#f8fafc] overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Calendario de Contenidos</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              Planificá publicaciones y promociones antes de que se te venza la fecha.
            </p>
          </div>
        </div>
        <button
          onClick={() => openNewModal()}
          className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Nueva Idea
        </button>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrevMonth}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-[15px] font-extrabold text-slate-900 min-w-[170px] text-center capitalize">{monthLabel}</div>
        <button
          onClick={goNextMonth}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
          title="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={goToday}
          className="ml-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-extrabold transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Grilla + Banco de Ideas */}
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 w-full bg-white border border-slate-200 rounded-[20px] shadow-xs p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wide pb-1">
                {wd}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2" style={{ gridTemplateRows: `repeat(${gridRows}, minmax(96px, auto))` }}>
            {days.map((day) => {
              const key = toDateKey(day);
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isToday = key === todayKey;
              const dayIdeas = byDate[key] || [];
              return (
                <div
                  key={key}
                  onClick={() => openNewModal(key)}
                  className={`rounded-2xl border p-2 flex flex-col gap-1 overflow-y-auto cursor-pointer transition-colors ${
                    isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div
                    className={`text-xs font-black shrink-0 ${
                      !isCurrentMonth ? 'text-slate-300' : isToday ? 'text-blue-700' : 'text-slate-900'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {dayIdeas.map((idea) => {
                    const s = TYPE_STYLES[idea.type];
                    return (
                      <button
                        key={idea.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(idea);
                        }}
                        className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-left text-[10px] font-bold border truncate shrink-0 ${s.chip}`}
                        title={idea.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                        <span className="truncate">{idea.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full xl:w-[300px] shrink-0 bg-white border border-slate-200 rounded-[20px] shadow-xs p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <div className="text-[13px] font-black text-slate-900">Banco de Ideas</div>
            <span className="ml-auto text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {ideaBank.length}
            </span>
          </div>
          {ideaBank.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-6">Sin ideas sueltas todavía.</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
              {ideaBank.map((idea) => {
                const s = TYPE_STYLES[idea.type];
                return (
                  <button
                    key={idea.id}
                    onClick={() => openEditModal(idea)}
                    className="text-left border border-slate-200 rounded-2xl p-3 bg-slate-50/60 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-[9.5px] font-extrabold uppercase tracking-wide ${s.textOnly}`}>
                        {CONTENT_IDEA_TYPE_LABELS[idea.type]}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 leading-snug">{idea.title}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva / Editar Idea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-base text-slate-900">{editingIdea ? 'Editar Idea' : 'Nueva Idea'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Título</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Descuento de fin de semana"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CONTENT_IDEA_TYPE_LABELS) as ContentIdeaType[]).map((t) => {
                    const s = TYPE_STYLES[t];
                    const selected = formType === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setFormType(t)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          selected ? s.pillActive : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white' : s.dot}`} />
                        {CONTENT_IDEA_TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Fecha <span className="font-medium text-slate-400">(opcional — sin fecha queda en el Banco de Ideas)</span>
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notas <span className="font-medium text-slate-400">(opcional)</span>
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Qué decir, links, ideas para la foto..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingIdea ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      confirmingDelete ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {confirmingDelete ? '¿Confirmar?' : 'Eliminar'}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md"
                  >
                    {editingIdea ? 'Guardar Cambios' : 'Agregar Idea'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
