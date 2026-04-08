import { useState, useCallback } from "react";

// ─── Mock data ────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = [
  "Todos", "Peito", "Costas", "Ombros", "Bíceps", "Tríceps",
  "Pernas", "Glúteos", "Core", "Cardio",
];

const EXERCISE_LIBRARY = [
  { id: "e1",  name: "Supino Reto com Barra",    group: "Peito",   difficulty: "intermediário", thumbnail: "💪" },
  { id: "e2",  name: "Supino Inclinado Halteres", group: "Peito",   difficulty: "intermediário", thumbnail: "💪" },
  { id: "e3",  name: "Crossover no Cabo",         group: "Peito",   difficulty: "básico",        thumbnail: "💪" },
  { id: "e4",  name: "Puxada Frontal",            group: "Costas",  difficulty: "básico",        thumbnail: "🏋️" },
  { id: "e5",  name: "Remada Curvada",            group: "Costas",  difficulty: "intermediário", thumbnail: "🏋️" },
  { id: "e6",  name: "Desenvolvimento com Barra", group: "Ombros",  difficulty: "intermediário", thumbnail: "🔝" },
  { id: "e7",  name: "Elevação Lateral",          group: "Ombros",  difficulty: "básico",        thumbnail: "🔝" },
  { id: "e8",  name: "Rosca Direta",              group: "Bíceps",  difficulty: "básico",        thumbnail: "💪" },
  { id: "e9",  name: "Agachamento Livre",         group: "Pernas",  difficulty: "avançado",      thumbnail: "🦵" },
  { id: "e10", name: "Leg Press 45°",             group: "Pernas",  difficulty: "básico",        thumbnail: "🦵" },
  { id: "e11", name: "Stiff",                     group: "Glúteos", difficulty: "intermediário", thumbnail: "🦵" },
  { id: "e12", name: "Prancha",                   group: "Core",    difficulty: "básico",        thumbnail: "🧘" },
];

const GROUP_COLORS = {
  Peito:   { bg: "bg-orange-50 dark:bg-orange-950/40",  text: "text-orange-600 dark:text-orange-400",  border: "border-orange-200 dark:border-orange-800" },
  Costas:  { bg: "bg-blue-50 dark:bg-blue-950/40",     text: "text-blue-600 dark:text-blue-400",     border: "border-blue-200 dark:border-blue-800" },
  Ombros:  { bg: "bg-yellow-50 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
  Bíceps:  { bg: "bg-red-50 dark:bg-red-950/40",       text: "text-red-600 dark:text-red-400",       border: "border-red-200 dark:border-red-800" },
  Tríceps: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  Pernas:  { bg: "bg-teal-50 dark:bg-teal-950/40",     text: "text-teal-600 dark:text-teal-400",     border: "border-teal-200 dark:border-teal-800" },
  Glúteos: { bg: "bg-teal-50 dark:bg-teal-950/40",     text: "text-teal-700 dark:text-teal-400",     border: "border-teal-200 dark:border-teal-800" },
  Core:    { bg: "bg-gray-100 dark:bg-gray-800/50",    text: "text-gray-600 dark:text-gray-400",     border: "border-gray-200 dark:border-gray-700" },
  Cardio:  { bg: "bg-gray-100 dark:bg-gray-800/50",    text: "text-gray-600 dark:text-gray-400",     border: "border-gray-200 dark:border-gray-700" },
};

const DIFF_STYLE = {
  básico:        "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
  intermediário: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
  avançado:      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
let idCounter = 1;
const uid = () => `item_${Date.now()}_${idCounter++}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onAdd }) {
  const colors = GROUP_COLORS[exercise.group] || GROUP_COLORS.Core;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-sm transition-shadow`}>
      <span className="text-2xl select-none">{exercise.thumbnail}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{exercise.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {exercise.group}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${DIFF_STYLE[exercise.difficulty]}`}>
            {exercise.difficulty}
          </span>
        </div>
      </div>
      <button
        onClick={() => onAdd(exercise)}
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white transition-all shadow-sm"
        title="Adicionar ao treino"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  );
}

function ExerciseRow({ item, onUpdate, onRemove }) {
  const colors = GROUP_COLORS[item.exercise.group] || GROUP_COLORS.Core;
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl select-none">{item.exercise.thumbnail}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.exercise.name}</p>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${colors.bg} ${colors.text} border ${colors.border}`}>
            {item.exercise.group}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
            </svg>
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="flex items-center gap-3 px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">{item.sets} séries</span>
        <span>×</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{item.reps} reps</span>
        {item.load && <><span>·</span><span className="font-medium text-orange-500">{item.load} kg</span></>}
        <span>·</span>
        <span>{item.rest}s descanso</span>
      </div>

      {/* Expanded editor */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/40">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Séries</span>
              <input
                type="number"
                min="1" max="20" value={item.sets}
                onChange={e => onUpdate(item.id, "sets", Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reps</span>
              <input
                type="text"
                value={item.reps}
                placeholder="12 ou 8-12"
                onChange={e => onUpdate(item.id, "reps", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Carga (kg)</span>
              <input
                type="number"
                min="0" step="2.5" value={item.load}
                onChange={e => onUpdate(item.id, "load", e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Descanso (s)</span>
              <select
                value={item.rest}
                onChange={e => onUpdate(item.id, "rest", Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {[30, 45, 60, 90, 120, 180].map(s => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 mt-3">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Observações</span>
            <textarea
              value={item.notes}
              onChange={e => onUpdate(item.id, "notes", e.target.value)}
              placeholder="Ex: Foco na fase excêntrica, pegada neutra..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function WorkoutDayTab({ day, isActive, onClick, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(day.label);

  const handleBlur = () => {
    setEditing(false);
    onRename(day.id, label || day.label);
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer select-none transition-all group
        ${isActive
          ? "bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/40"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      onClick={onClick}
    >
      {editing ? (
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => e.key === "Enter" && handleBlur()}
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-none outline-none text-sm font-medium w-20"
        />
      ) : (
        <span
          className="text-sm font-medium whitespace-nowrap"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
        >
          {day.label}
        </span>
      )}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
        {day.exercises.length}
      </span>
      {isActive && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(day.id); }}
          className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/30 transition-all ml-0.5"
        >
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkoutBuilder() {
  const [planName, setPlanName] = useState("Hipertrofia — Intermediário A/B");
  const [editingName, setEditingName] = useState(false);

  const [days, setDays] = useState([
    { id: "d1", label: "Dia A — Peito/Costas", exercises: [] },
    { id: "d2", label: "Dia B — Pernas",        exercises: [] },
  ]);
  const [activeDay, setActiveDay] = useState("d1");

  const [selectedGroup, setSelectedGroup] = useState("Todos");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  const currentDay = days.find(d => d.id === activeDay) || days[0];

  const filteredExercises = EXERCISE_LIBRARY.filter(ex => {
    const matchGroup = selectedGroup === "Todos" || ex.group === selectedGroup;
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const addDay = () => {
    const newDay = { id: uid(), label: `Dia ${String.fromCharCode(65 + days.length)}`, exercises: [] };
    setDays(prev => [...prev, newDay]);
    setActiveDay(newDay.id);
  };

  const removeDay = useCallback((dayId) => {
    setDays(prev => {
      const next = prev.filter(d => d.id !== dayId);
      if (activeDay === dayId && next.length > 0) setActiveDay(next[0].id);
      return next;
    });
  }, [activeDay]);

  const renameDay = useCallback((dayId, label) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, label } : d));
  }, []);

  const addExercise = useCallback((exercise) => {
    setDays(prev => prev.map(d => {
      if (d.id !== activeDay) return d;
      if (d.exercises.some(e => e.exercise.id === exercise.id)) return d; // avoid duplicate
      return {
        ...d,
        exercises: [...d.exercises, { id: uid(), exercise, sets: 4, reps: "10-12", load: "", rest: 60, notes: "" }],
      };
    }));
  }, [activeDay]);

  const updateExercise = useCallback((itemId, field, value) => {
    setDays(prev => prev.map(d => ({
      ...d,
      exercises: d.exercises.map(e => e.id === itemId ? { ...e, [field]: value } : e),
    })));
  }, []);

  const removeExercise = useCallback((itemId) => {
    setDays(prev => prev.map(d => ({
      ...d,
      exercises: d.exercises.filter(e => e.id !== itemId),
    })));
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // TODO: dispatch to Firebase / API
    console.log("Saving plan:", { planName, days });
  };

  const totalExercises = days.reduce((sum, d) => sum + d.exercises.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 hidden sm:block">FitCoach</span>
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                className="text-sm font-medium bg-transparent border-b-2 border-orange-400 outline-none text-gray-900 dark:text-gray-100 min-w-0 w-full max-w-xs"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-orange-500 transition-colors truncate max-w-xs flex items-center gap-1.5 group"
              >
                {planName}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">{totalExercises} exercícios · {days.length} dias</span>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95
                ${saved
                  ? "bg-green-500 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/40"
                }`}
            >
              {saved ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  Salvo!
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                  Salvar
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Day tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {days.map(day => (
              <WorkoutDayTab
                key={day.id}
                day={day}
                isActive={day.id === activeDay}
                onClick={() => setActiveDay(day.id)}
                onRename={renameDay}
                onRemove={removeDay}
              />
            ))}
            <button
              onClick={addDay}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-500 transition-all text-sm whitespace-nowrap"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              Novo dia
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

          {/* ── Left: current day exercises ─────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{currentDay?.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {currentDay?.exercises.length === 0
                    ? "Nenhum exercício adicionado"
                    : `${currentDay?.exercises.length} exercício${currentDay?.exercises.length > 1 ? "s" : ""}`
                  }
                </p>
              </div>
              {currentDay?.exercises.length > 0 && (
                <span className="text-xs text-gray-400">Duplo clique na aba para renomear</span>
              )}
            </div>

            {currentDay?.exercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Adicione exercícios</p>
                <p className="text-sm text-gray-400">Escolha da biblioteca ao lado →</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {currentDay?.exercises.map((item, idx) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-medium flex items-center justify-center mt-3">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <ExerciseRow
                        item={item}
                        onUpdate={updateExercise}
                        onRemove={removeExercise}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Right: exercise library ──────────────────────────────────── */}
          <aside>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm sticky top-20">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Biblioteca de exercícios</p>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar exercício..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Muscle group filter */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {MUSCLE_GROUPS.map(group => (
                    <button
                      key={group}
                      onClick={() => setSelectedGroup(group)}
                      className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                        ${selectedGroup === group
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        }`}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exercise list */}
              <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-[520px] overflow-y-auto overscroll-contain">
                {filteredExercises.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">Nenhum exercício encontrado</p>
                  </div>
                ) : (
                  <div className="p-3 flex flex-col gap-2">
                    {filteredExercises.map(ex => {
                      const alreadyAdded = currentDay?.exercises.some(e => e.exercise.id === ex.id);
                      return (
                        <div key={ex.id} className={alreadyAdded ? "opacity-40 pointer-events-none" : ""}>
                          <ExerciseCard exercise={ex} onAdd={addExercise} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80">
                <p className="text-xs text-gray-400 text-center">{filteredExercises.length} exercícios · Exercícios já adicionados ficam opacos</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}