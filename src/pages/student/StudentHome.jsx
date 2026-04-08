// src/pages/student/StudentHome.jsx
import { useState, useEffect, useRef } from "react";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import { useAuth }           from "@/contexts/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast  from "react-hot-toast";
import clsx   from "clsx";

// ── Rest timer ─────────────────────────────────────────────────
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(intervalRef.current); onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-xs text-center shadow-xl">
        <p className="text-sm font-medium text-gray-400 mb-4">Descanso</p>

        {/* Circle progress */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#FF5722" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-semibold text-gray-900">{remaining}</span>
          </div>
        </div>

        <button onClick={onDone} className="btn-ghost w-full py-2.5 text-sm">
          Pular descanso
        </button>
      </div>
    </div>
  );
}

// ── Exercise card ──────────────────────────────────────────────
function ExerciseCard({ item, index, done, onToggle, onStartTimer }) {
  const [load, setLoad]     = useState(item.load ?? "");
  const [effort, setEffort] = useState(0);

  return (
    <div className={clsx(
      "rounded-2xl border p-4 transition-all",
      done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-start gap-3">
        {/* Check button */}
        <button
          onClick={() => onToggle(item.id)}
          className={clsx(
            "w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5",
            done ? "border-green-500 bg-green-500" : "border-gray-300"
          )}
        >
          {done && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={clsx("text-sm font-semibold truncate", done ? "text-green-700 line-through" : "text-gray-900")}>
              {item.exercise?.name ?? item.name}
            </p>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {item.sets} × {item.reps}
            </span>
          </div>

          {!done && (
            <>
              {/* Load input */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-xs text-gray-400 whitespace-nowrap">Carga (kg)</label>
                  <input
                    type="number" min="0" step="2.5"
                    value={load}
                    onChange={e => setLoad(e.target.value)}
                    placeholder={item.load || "0"}
                    className="input py-1 text-sm w-20 text-center"
                  />
                </div>
                {item.rest > 0 && (
                  <button
                    onClick={() => onStartTimer(item.rest)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                    </svg>
                    {item.rest}s
                  </button>
                )}
              </div>

              {/* Effort (RPE) */}
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1.5">Esforço percebido</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      onClick={() => setEffort(n)}
                      className={clsx(
                        "flex-1 h-6 rounded text-[10px] font-medium transition-all",
                        effort >= n
                          ? n <= 4 ? "bg-green-400 text-white"
                          : n <= 7 ? "bg-yellow-400 text-white"
                          : "bg-red-400 text-white"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {item.notes && (
                <p className="text-xs text-gray-400 mt-2 italic">💡 {item.notes}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function StudentHome() {
  const { profile }       = useAuth();
  const { plan, loading } = useStudentWorkout();

  const [activeDay, setActiveDay] = useState(0);
  const [done, setDone]           = useState(new Set());
  const [timer, setTimer]         = useState(null); // { seconds }
  const [finishing, setFinishing] = useState(false);

  const currentDay = plan?.days?.[activeDay];
  const exercises  = currentDay?.exercises ?? [];
  const allDone    = exercises.length > 0 && exercises.every(e => done.has(e.id));

  function toggleDone(id) {
    setDone(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await addDoc(collection(db, "workoutLogs"), {
        studentId:  profile.uid,
        planId:     plan.id,
        dayLabel:   currentDay.label,
        exercisesDone: exercises.length,
        date:       serverTimestamp(),
      });
      toast.success("Treino concluído! 🎉");
      setDone(new Set());
    } catch { toast.error("Erro ao salvar treino."); }
    finally { setFinishing(false); }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 bg-gray-100 rounded w-40 mb-4 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-4 mb-3 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-900 mb-1">Nenhum treino ativo</p>
        <p className="text-sm text-gray-400">Seu personal ainda não atribuiu um plano de treino. Aguarde!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">Olá, {profile?.name?.split(" ")[0]} 👋</p>
        <h1 className="text-xl font-semibold text-gray-900 truncate">{plan.name}</h1>

        {/* Day selector */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {plan.days?.map((day, i) => (
            <button
              key={day.id}
              onClick={() => { setActiveDay(i); setDone(new Set()); }}
              className={clsx(
                "flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeDay === i
                  ? "bg-brand-500 text-white shadow-brand"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises */}
      <div className="p-5 flex flex-col gap-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${exercises.length > 0 ? (done.size / exercises.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{done.size}/{exercises.length}</span>
        </div>

        {exercises.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum exercício neste dia.</p>
        ) : (
          exercises.map((item, i) => (
            <ExerciseCard
              key={item.id}
              item={item}
              index={i}
              done={done.has(item.id)}
              onToggle={toggleDone}
              onStartTimer={(secs) => setTimer({ seconds: secs })}
            />
          ))
        )}

        {/* Finish button */}
        {allDone && (
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="btn-primary w-full py-4 text-base mt-4"
          >
            {finishing ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>
            ) : "🏆 Concluir treino"}
          </button>
        )}
      </div>

      {/* Rest timer overlay */}
      {timer && (
        <RestTimer
          seconds={timer.seconds}
          onDone={() => setTimer(null)}
        />
      )}
    </div>
  );
}