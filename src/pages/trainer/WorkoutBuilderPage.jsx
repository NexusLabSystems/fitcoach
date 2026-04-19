// src/pages/trainer/WorkoutBuilderPage.jsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams }  from "react-router-dom";
import { useExercises, MUSCLE_GROUPS } from "@/hooks/useExercises";
import { useWorkouts }             from "@/hooks/useWorkouts";
import { useStudents }             from "@/hooks/useStudents";
import toast                       from "react-hot-toast";
import clsx                        from "clsx";
import VideoModal, { youtubeThumbnail } from "@/components/ui/VideoModal";
import ExerciseFormModal from "@/components/exercises/ExerciseFormModal";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  uid, countExercises, isExerciseInDay,
  mergeIntoSuperset, addToSuperset,
  removeFromSuperset, updateSupersetSubItem, updateSupersetContainer,
} from "@/lib/supersetUtils";

const DIFF_STYLE = {
  básico:        "badge-green",
  intermediário: "badge-gold",
  avançado:      "badge-red",
};

// ── SupersetSubRow ─────────────────────────────────────────────
function SupersetSubRow({ sub, supersetId, index, onUpdate, onRemove, onPlay, canRemove }) {
  const [open, setOpen] = useState(false);
  const ex = sub.exercise ?? {};

  return (
    <div className={clsx("bg-white", index > 0 && "border-t border-orange-100")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex items-center justify-center flex-shrink-0 w-5 h-5 text-xs font-semibold rounded-full bg-orange-100 text-orange-600">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{ex.name}</p>
          <p className="text-xs text-gray-400">{sub.sets}×{sub.reps}{sub.load ? ` · ${sub.load}kg` : ""}</p>
        </div>
        {ex.videoUrl && (
          <button onClick={() => onPlay(ex)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:text-brand-500 hover:bg-brand-50">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
          </button>
        )}
        <button onClick={() => setOpen(v => !v)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:bg-gray-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
          </svg>
        </button>
        {canRemove && (
          <button onClick={() => onRemove(supersetId, sub.id)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:text-red-500 hover:bg-red-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-3 p-4 border-t border-orange-50 bg-orange-50/40 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="label">Séries</span>
            <input type="number" min="1" max="20" value={sub.sets}
              onChange={e => onUpdate(supersetId, sub.id, "sets", Number(e.target.value))}
              className="input py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Reps</span>
            <input type="text" value={sub.reps} placeholder="12 ou 8-12"
              onChange={e => onUpdate(supersetId, sub.id, "reps", e.target.value)}
              className="input py-1.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Carga (kg)</span>
            <input type="number" min="0" step="2.5" value={sub.load}
              onChange={e => onUpdate(supersetId, sub.id, "load", e.target.value)}
              className="input py-1.5 text-sm" />
          </label>
          <div className="col-span-2 sm:col-span-3">
            <label className="flex flex-col gap-1">
              <span className="label">Observações</span>
              <textarea rows={2} value={sub.notes} placeholder="Ex: foco na contração..."
                onChange={e => onUpdate(supersetId, sub.id, "notes", e.target.value)}
                className="text-sm resize-none input" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SupersetRow ────────────────────────────────────────────────
function SupersetRow({ item, index, onUpdateSub, onUpdateContainer, onRemoveSub, onRemove, onPlay, onAddThird }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const badge = item.items.length === 2 ? "Bi-set" : "Tri-set";

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden border-2 border-orange-200 rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50">
        <button {...attributes} {...listeners}
          className="flex-shrink-0 text-orange-300 hover:text-orange-500 cursor-grab active:cursor-grabbing touch-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </button>
        <span className="text-xs font-bold tracking-wider text-orange-600 uppercase">{badge}</span>
        <span className="text-xs text-orange-400 ml-auto">Descanso após o grupo</span>
        <select
          value={item.rest}
          onChange={e => onUpdateContainer(item.id, "rest", Number(e.target.value))}
          className="py-0.5 text-xs border border-orange-200 rounded-lg bg-white text-gray-700 pr-6 pl-2"
          onClick={e => e.stopPropagation()}
        >
          {[30,45,60,90,120,180].map(s => <option key={s} value={s}>{s}s</option>)}
        </select>
        <button onClick={() => onRemove(item.id)} className="flex items-center justify-center text-orange-300 rounded-lg w-7 h-7 hover:text-red-500 hover:bg-red-50 ml-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Sub-exercises */}
      {item.items.map((sub, i) => (
        <SupersetSubRow
          key={sub.id}
          sub={sub}
          supersetId={item.id}
          index={i}
          onUpdate={onUpdateSub}
          onRemove={onRemoveSub}
          onPlay={onPlay}
          canRemove={item.items.length > 2}
        />
      ))}

      {/* Add third exercise (only when bi-set) */}
      {item.items.length === 2 && (
        <button onClick={() => onAddThird(item.id)}
          className="flex items-center justify-center w-full gap-1.5 py-2 text-xs font-medium text-orange-500 transition-colors bg-orange-50 hover:bg-orange-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Adicionar exercício (tri-set)
        </button>
      )}
    </div>
  );
}

// ── ExerciseRow ────────────────────────────────────────────────
function ExerciseRow({ item, index, onUpdate, onRemove, onPlay, onBiset }) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <button {...attributes} {...listeners}
          className="flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none" tabIndex={-1}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
          </svg>
        </button>
        <span className="flex items-center justify-center flex-shrink-0 w-5 h-5 text-xs font-semibold rounded-full bg-brand-100 text-brand-600">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.exercise.name}</p>
          {item.exercise.muscleGroup === "Cardio" ? (
            <p className="text-xs text-gray-400">{item.duration ?? 30} min{item.intensity ? ` · vel. ${item.intensity}` : ""} · {item.rest}s descanso</p>
          ) : (
            <p className="text-xs text-gray-400">{item.sets}×{item.reps} · {item.load ? `${item.load}kg · ` : ""}{item.rest}s descanso</p>
          )}
        </div>
        {item.exercise.videoUrl && (
          <button onClick={() => onPlay(item.exercise)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:text-brand-500 hover:bg-brand-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
          </button>
        )}
        <button onClick={() => onBiset(item.id)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors flex-shrink-0"
          title="Criar bi-set com outro exercício">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
          </svg>
          Bi-set
        </button>
        <button onClick={() => setOpen(v => !v)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:bg-gray-100">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
          </svg>
        </button>
        <button onClick={() => onRemove(item.id)} className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:text-red-500 hover:bg-red-50">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {open && (
        item.exercise.muscleGroup === "Cardio" ? (
          <div className="grid grid-cols-2 gap-3 p-4 border-t border-gray-100 bg-gray-50 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="label">Duração (min)</span>
              <input type="number" min="1" max="180" value={item.duration ?? 30}
                onChange={e => onUpdate(item.id, "duration", Number(e.target.value))}
                className="input py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Velocidade / Nível</span>
              <input type="text" value={item.intensity ?? ""} placeholder="Ex: 8 km/h, nível 5"
                onChange={e => onUpdate(item.id, "intensity", e.target.value)}
                className="input py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Descanso</span>
              <select value={item.rest} onChange={e => onUpdate(item.id, "rest", Number(e.target.value))} className="input py-1.5 text-sm">
                {[30,45,60,90,120,180].map(s => <option key={s} value={s}>{s}s</option>)}
              </select>
            </label>
            <div className="col-span-2 sm:col-span-3">
              <label className="flex flex-col gap-1">
                <span className="label">Observações</span>
                <textarea rows={2} value={item.notes} placeholder="Ex: manter frequência cardíaca entre 130-150 bpm..."
                  onChange={e => onUpdate(item.id, "notes", e.target.value)}
                  className="text-sm resize-none input" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4 border-t border-gray-100 bg-gray-50 sm:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="label">Séries</span>
              <input type="number" min="1" max="20" value={item.sets}
                onChange={e => onUpdate(item.id, "sets", Number(e.target.value))}
                className="input py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Reps</span>
              <input type="text" value={item.reps} placeholder="12 ou 8-12"
                onChange={e => onUpdate(item.id, "reps", e.target.value)}
                className="input py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Carga (kg)</span>
              <input type="number" min="0" step="2.5" value={item.load}
                onChange={e => onUpdate(item.id, "load", e.target.value)}
                className="input py-1.5 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Descanso</span>
              <select value={item.rest} onChange={e => onUpdate(item.id, "rest", Number(e.target.value))} className="input py-1.5 text-sm">
                {[30,45,60,90,120,180].map(s => <option key={s} value={s}>{s}s</option>)}
              </select>
            </label>
            <div className="col-span-2 sm:col-span-4">
              <label className="flex flex-col gap-1">
                <span className="label">Observações</span>
                <textarea rows={2} value={item.notes} placeholder="Ex: foco na fase excêntrica..."
                  onChange={e => onUpdate(item.id, "notes", e.target.value)}
                  className="text-sm resize-none input" />
              </label>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function WorkoutBuilderPage() {
  const navigate              = useNavigate();
  const { id }                = useParams();
  const { createPlan, updatePlan, getPlan } = useWorkouts();
  const { students }          = useStudents();
  const { exercises: libraryExercises, loading: exLoading } = useExercises();

  const [planName, setPlanName]     = useState("Novo Plano de Treino");
  const [studentId, setStudentId]   = useState("");
  const [days, setDays]             = useState([
    { id: uid(), label: "Dia A", exercises: [] },
  ]);
  const [activeDay, setActiveDay]   = useState(null);
  const [group, setGroup]           = useState("Todos");
  const [search, setSearch]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(!!id);
  const [videoExercise, setVideo]   = useState(null);
  const [newExModal, setNewExModal] = useState(false);
  // null | { mode: "new", targetId } | { mode: "extend", supersetId }
  const [supersetTarget, setSupersetTarget] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { if (days.length > 0 && !activeDay) setActiveDay(days[0].id); }, [days]);

  useEffect(() => {
    if (!id) return;
    getPlan(id).then(plan => {
      setPlanName(plan.name);
      setStudentId(plan.studentId ?? "");
      setDays(plan.days?.length > 0 ? plan.days : [{ id: uid(), label: "Dia A", exercises: [] }]);
      setLoading(false);
    }).catch(() => { toast.error("Plano não encontrado."); navigate("/trainer/workouts"); });
  }, [id]);

  const currentDay = days.find(d => d.id === activeDay);

  const filteredExercises = libraryExercises.filter(ex => {
    const mGroup  = group === "Todos" || ex.muscleGroup === group;
    const mSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return mGroup && mSearch;
  });

  // ── Day operations ─────────────────────────────────────────
  const addDay = () => {
    const letter = String.fromCharCode(65 + days.length);
    const newDay = { id: uid(), label: `Dia ${letter}`, exercises: [] };
    setDays(prev => [...prev, newDay]);
    setActiveDay(newDay.id);
  };

  const removeDay = (dayId) => {
    setDays(prev => {
      const next = prev.filter(d => d.id !== dayId);
      if (activeDay === dayId) setActiveDay(next[0]?.id ?? null);
      return next;
    });
  };

  const renameDay = (dayId, label) => {
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, label } : d));
  };

  // ── Exercise operations ────────────────────────────────────
  const addExercise = useCallback((exercise) => {
    if (supersetTarget) {
      const { mode } = supersetTarget;
      setDays(prev => prev.map(d => {
        if (d.id !== activeDay) return d;
        const updated = mode === "new"
          ? mergeIntoSuperset(d.exercises, supersetTarget.targetId, exercise)
          : addToSuperset(d.exercises, supersetTarget.supersetId, exercise);
        return { ...d, exercises: updated };
      }));
      setSupersetTarget(null);
      return;
    }

    setDays(prev => prev.map(d => {
      if (d.id !== activeDay) return d;
      if (isExerciseInDay(d.exercises, exercise.id)) {
        toast("Exercício já adicionado neste dia.", { icon: "ℹ️" });
        return d;
      }
      const isCardio = exercise.muscleGroup === "Cardio";
      const defaults = isCardio
        ? { id: uid(), exercise, duration: 30, intensity: "", rest: 60, notes: "" }
        : { id: uid(), exercise, sets: 4, reps: "10-12", load: "", rest: 60, notes: "" };
      return { ...d, exercises: [...d.exercises, defaults] };
    }));
  }, [activeDay, supersetTarget]);

  const updateExercise = useCallback((itemId, field, value) => {
    setDays(prev => prev.map(d => ({
      ...d,
      exercises: d.exercises.map(e =>
        e.id === itemId
          ? e.type === "superset"
            ? updateSupersetContainer(d.exercises, itemId, field, value).find(x => x.id === itemId)
            : { ...e, [field]: value }
          : e
      ),
    })));
  }, []);

  const updateSubItem = useCallback((supersetId, subId, field, value) => {
    setDays(prev => prev.map(d => ({
      ...d,
      exercises: updateSupersetSubItem(d.exercises, supersetId, subId, field, value),
    })));
  }, []);

  const removeExercise = useCallback((itemId) => {
    setDays(prev => prev.map(d => ({ ...d, exercises: d.exercises.filter(e => e.id !== itemId) })));
  }, []);

  const removeSubItem = useCallback((supersetId, subId) => {
    setDays(prev => prev.map(d => ({
      ...d,
      exercises: removeFromSuperset(d.exercises, supersetId, subId),
    })));
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setDays(prev => prev.map(d => {
      if (d.id !== activeDay) return d;
      const oldIndex = d.exercises.findIndex(e => e.id === active.id);
      const newIndex = d.exercises.findIndex(e => e.id === over.id);
      return { ...d, exercises: arrayMove(d.exercises, oldIndex, newIndex) };
    }));
  }, [activeDay]);

  // ── Save ───────────────────────────────────────────────────
  async function handleSave() {
    if (!planName.trim()) { toast.error("Dê um nome ao plano."); return; }
    setSaving(true);
    try {
      const payload = { name: planName.trim(), studentId: studentId || null, days };
      if (id) {
        await updatePlan(id, payload);
        toast.success("Plano atualizado!");
      } else {
        const newId = await createPlan(payload);
        toast.success("Plano criado!");
        navigate(`/trainer/workouts/${newId}`, { replace: true });
      }
    } catch { toast.error("Erro ao salvar."); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="w-64 h-8 mb-6 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="flex flex-col items-start gap-4 mb-6 sm:flex-row sm:items-center">
        <button onClick={() => navigate("/trainer/workouts")} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Treinos
        </button>
        <div className="flex items-center flex-1 min-w-0 gap-3">
          <input value={planName} onChange={e => setPlanName(e.target.value)}
            className="flex-1 min-w-0 p-0 text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
            placeholder="Nome do plano..." />
        </div>
        <div className="flex items-center gap-3">
          <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input py-1.5 text-sm w-44">
            <option value="">Sem aluno vinculado</option>
            {students.filter(s => s.status === "active").map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <path d="M17 21v-8H7v8M7 3v5h8"/>
              </svg>Salvar</>
            )}
          </button>
        </div>
      </div>

      {/* ── Day tabs ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pb-1 mb-6 overflow-x-auto">
        {days.map(day => (
          <DayTab key={day.id} day={day} isActive={activeDay === day.id}
            onClick={() => setActiveDay(day.id)}
            onRename={renameDay}
            onRemove={days.length > 1 ? removeDay : null} />
        ))}
        <button onClick={addDay} className="flex items-center flex-shrink-0 gap-1 px-3 py-2 text-sm text-gray-500 transition-colors bg-gray-100 rounded-xl hover:bg-orange-50 hover:text-brand-500 whitespace-nowrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Novo dia
        </button>
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* Left: exercise list */}
        <section>
          <p className="mb-4 text-sm text-gray-500">
            {!currentDay || countExercises(currentDay.exercises) === 0
              ? "Nenhum exercício — adicione da biblioteca →"
              : `${countExercises(currentDay.exercises)} exercício${countExercises(currentDay.exercises) > 1 ? "s" : ""}`}
          </p>

          {!currentDay || currentDay.exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-gray-200 border-dashed rounded-2xl">
              <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-2xl bg-brand-50">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                </svg>
              </div>
              <p className="text-sm text-gray-400">Escolha um exercício na biblioteca</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentDay.exercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {currentDay.exercises.map((item, i) =>
                    item.type === "superset" ? (
                      <SupersetRow
                        key={item.id}
                        item={item}
                        index={i}
                        onUpdateSub={updateSubItem}
                        onUpdateContainer={updateExercise}
                        onRemoveSub={removeSubItem}
                        onRemove={removeExercise}
                        onPlay={setVideo}
                        onAddThird={id => setSupersetTarget({ mode: "extend", supersetId: id })}
                      />
                    ) : (
                      <ExerciseRow
                        key={item.id}
                        item={item}
                        index={i}
                        onUpdate={updateExercise}
                        onRemove={removeExercise}
                        onPlay={setVideo}
                        onBiset={id => setSupersetTarget({ mode: "new", targetId: id })}
                      />
                    )
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        {/* Right: exercise library */}
        <aside className="flex flex-col overflow-hidden bg-white border border-gray-200 rounded-2xl" style={{ maxHeight: "72vh" }}>
          <div className="flex-shrink-0 p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Biblioteca</p>
              <button onClick={() => setNewExModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Novo exercício
              </button>
            </div>
            <div className="relative">
              <svg className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Buscar..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 py-1.5 text-sm" />
            </div>
          </div>

          {/* Superset mode banner */}
          {supersetTarget && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border-b border-orange-200 flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              <span className="text-xs font-medium text-orange-700 flex-1">
                {supersetTarget.mode === "new"
                  ? "Selecione o exercício para o bi-set..."
                  : "Selecione o exercício para o tri-set..."}
              </span>
              <button onClick={() => setSupersetTarget(null)} className="text-orange-400 hover:text-orange-700">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* Muscle group filter */}
          <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100">
            <div className="flex gap-1 pb-1 overflow-x-auto">
              {MUSCLE_GROUPS.map(g => (
                <button key={g} onClick={() => setGroup(g)}
                  className={clsx("flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                    group === g ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-2 p-3 overflow-y-auto">
            {filteredExercises.map(ex => {
              const added     = isExerciseInDay(currentDay?.exercises ?? [], ex.id);
              const thumbnail = youtubeThumbnail(ex.videoUrl);
              return (
                <div key={ex.id}
                  className={clsx("flex items-center gap-3 p-2.5 rounded-xl border transition-colors",
                    added && !supersetTarget
                      ? "border-gray-100 opacity-40"
                      : supersetTarget && added
                        ? "border-gray-100 opacity-40 pointer-events-none"
                        : "border-gray-100 hover:border-brand-200 hover:bg-orange-50 cursor-pointer"
                  )}
                  onClick={() => !added && addExercise(ex)}>
                  {thumbnail ? (
                    <div className="relative flex-shrink-0 w-10 h-10 overflow-hidden rounded-lg bg-gray-100">
                      <img src={thumbnail} alt={ex.name} className="object-cover w-full h-full" loading="lazy" />
                      {ex.videoUrl && (
                        <button onClick={e => { e.stopPropagation(); setVideo(ex); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M5 3l14 9-14 9V3z"/></svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ex.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-gray-400">{ex.muscleGroup}</span>
                      <span className={`badge text-[11px] py-0 ${DIFF_STYLE[ex.difficulty]}`}>{ex.difficulty}</span>
                    </div>
                  </div>
                  {!added && (
                    <div className={clsx("flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-lg",
                      supersetTarget ? "bg-orange-500" : "bg-brand-500"
                    )}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <ExerciseFormModal open={newExModal} onClose={() => setNewExModal(false)} />

      <VideoModal open={!!videoExercise} onClose={() => setVideo(null)}
        title={videoExercise?.name} videoUrl={videoExercise?.videoUrl} />
    </div>
  );
}

// ── DayTab ─────────────────────────────────────────────────────
function DayTab({ day, isActive, onClick, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel]     = useState(day.label);
  const commit = () => { setEditing(false); onRename(day.id, label || day.label); };

  return (
    <div onClick={onClick}
      className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer select-none transition-all flex-shrink-0 group",
        isActive ? "bg-brand-500 text-white shadow-brand" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}>
      {editing ? (
        <input autoFocus value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()}
          onClick={e => e.stopPropagation()}
          className="w-20 text-sm font-medium bg-transparent border-none outline-none" />
      ) : (
        <span className="text-sm font-medium whitespace-nowrap"
          onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>
          {day.label}
        </span>
      )}
      <span className={clsx("text-xs px-1.5 py-0.5 rounded-full",
        isActive ? "bg-white/20" : "bg-gray-200 text-gray-500"
      )}>
        {countExercises(day.exercises)}
      </span>
      {isActive && onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(day.id); }}
          className="flex items-center justify-center w-4 h-4 transition-all rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/30">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
}
