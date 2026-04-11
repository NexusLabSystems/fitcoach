// src/pages/student/StudentHome.jsx
import { useState, useEffect, useRef } from "react";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import { useAuth }           from "@/contexts/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast  from "react-hot-toast";
import clsx   from "clsx";

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(ref.current); onDone(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, []);
  const pct = ((seconds - remaining) / seconds) * 100;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="w-full max-w-xs p-8 text-center bg-white shadow-xl rounded-3xl">
        <p className="mb-4 text-sm font-medium text-gray-400">Descanso</p>
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
            <circle cx="60" cy="60" r="54" fill="none" stroke="#FF5722" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-semibold text-gray-900">{remaining}</span>
          </div>
        </div>
        <button onClick={onDone} className="btn-ghost w-full py-2.5 text-sm">Pular descanso</button>
      </div>
    </div>
  );
}

function ExerciseDetailModal({ item, onClose }) {
  const ex   = item.exercise ?? {};
  const ytId = getYouTubeId(ex.videoUrl);
  const [tab, setTab] = useState(ytId ? "video" : "info");

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-start justify-between px-5 pt-3 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-semibold leading-tight text-gray-900">{ex.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {ex.muscleGroup && <span className="text-xs badge-orange">{ex.muscleGroup}</span>}
              {ex.difficulty  && <span className="text-xs badge-gray">{ex.difficulty}</span>}
              {ex.equipment   && <span className="text-xs badge-gray">{ex.equipment}</span>}
            </div>
          </div>
          <button onClick={onClose} className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 border-b bg-brand-50 border-brand-100">
          {[
            { label: "Séries",   value: item.sets },
            { label: "Reps",     value: item.reps },
            { label: "Carga",    value: item.load ? `${item.load} kg` : "—" },
            { label: "Descanso", value: `${item.rest}s` },
          ].map(s => (
            <div key={s.label} className="flex-1 text-center">
              <p className="text-lg font-semibold text-brand-600">{s.value}</p>
              <p className="text-[10px] text-brand-400 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {ytId && (
          <div className="flex px-5 border-b border-gray-100">
            {[{ id: "video", label: "Vídeo" }, { id: "info", label: "Instruções" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx("px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                  tab === t.id ? "border-brand-500 text-brand-600" : "border-transparent text-gray-400 hover:text-gray-600"
                )}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {tab === "video" && ytId && (
            <div className="bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title={ex.name}
              />
            </div>
          )}
          {tab === "info" && (
            <div className="px-5 py-4">
              {ex.description ? (
                <>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">Como executar</p>
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{ex.description}</p>
                </>
              ) : (
                <p className="py-6 text-sm text-center text-gray-400">Nenhuma instrução adicionada.</p>
              )}
              {item.notes && (
                <div className="p-3 mt-4 border border-yellow-100 bg-yellow-50 rounded-xl">
                  <p className="mb-1 text-xs font-semibold text-yellow-700">Observação do personal</p>
                  <p className="text-sm text-yellow-800">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ item, done, onToggle, onStartTimer, onOpenDetail }) {
  const [load, setLoad]     = useState(item.load ?? "");
  const [effort, setEffort] = useState(0);
  const ex       = item.exercise ?? {};
  const hasVideo = !!getYouTubeId(ex.videoUrl);

  return (
    <div className={clsx("rounded-2xl border transition-all overflow-hidden", done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white")}>
      <div className="flex items-start gap-3 p-4">
        <button onClick={() => onToggle(item.id)}
          className={clsx("w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all mt-0.5",
            done ? "border-green-500 bg-green-500" : "border-gray-300"
          )}>
          {done && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className={clsx("text-sm font-semibold", done ? "text-green-700 line-through" : "text-gray-900")}>
              {ex.name ?? item.name}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs text-gray-400">{item.sets}×{item.reps}</span>
              <button onClick={() => onOpenDetail(item)}
                className={clsx("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                  hasVideo ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}>
                {hasVideo ? (
                  <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>Ver</>
                ) : (
                  <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>Info</>
                )}
              </button>
            </div>
          </div>
          {ex.muscleGroup && !done && <span className="text-[11px] text-gray-400">{ex.muscleGroup}</span>}
        </div>
      </div>

      {!done && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center flex-1 gap-2">
              <label className="text-xs text-gray-400 whitespace-nowrap">Carga (kg)</label>
              <input type="number" min="0" step="2.5" value={load}
                onChange={e => setLoad(e.target.value)} placeholder={item.load || "0"}
                className="w-20 py-1 text-sm text-center input" />
            </div>
            {item.rest > 0 && (
              <button onClick={() => onStartTimer(item.rest)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
                {item.rest}s
              </button>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Esforço percebido</p>
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setEffort(n)}
                  className={clsx("flex-1 h-6 rounded text-[10px] font-medium transition-all",
                    effort >= n
                      ? n <= 4 ? "bg-green-400 text-white" : n <= 7 ? "bg-yellow-400 text-white" : "bg-red-400 text-white"
                      : "bg-gray-100 text-gray-400"
                  )}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {item.notes && <p className="text-xs italic text-gray-400">💡 {item.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function StudentHome() {
  const { profile }       = useAuth();
  const { plan, loading } = useStudentWorkout();
  const [activeDay, setActiveDay]   = useState(0);
  const [done, setDone]             = useState(new Set());
  const [timer, setTimer]           = useState(null);
  const [finishing, setFinishing]   = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const currentDay = plan?.days?.[activeDay];
  const exercises  = currentDay?.exercises ?? [];
  const allDone    = exercises.length > 0 && exercises.every(e => done.has(e.id));

  function toggleDone(id) {
    setDone(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await addDoc(collection(db, "workoutLogs"), {
        studentId: profile.uid, planId: plan.id,
        dayLabel: currentDay.label, exercisesDone: exercises.length,
        date: serverTimestamp(),
      });
      toast.success("Treino concluído! 🎉");
      setDone(new Set());
    } catch { toast.error("Erro ao salvar treino."); }
    finally { setFinishing(false); }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="w-40 h-6 mb-4 bg-gray-100 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 mb-3 card animate-pulse">
            <div className="w-2/3 h-4 mb-2 bg-gray-100 rounded" />
            <div className="w-1/3 h-3 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mb-4 bg-gray-100 rounded-2xl">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
          </svg>
        </div>
        <p className="mb-1 text-base font-semibold text-gray-900">Nenhum treino ativo</p>
        <p className="text-sm text-gray-400">Seu personal ainda não atribuiu um plano de treino.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-5 pt-12 pb-5 bg-white border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-0.5">Olá, {profile?.name?.split(" ")[0]} 👋</p>
        <h1 className="text-xl font-semibold text-gray-900 truncate">{plan.name}</h1>
        <div className="flex gap-2 pb-1 mt-4 overflow-x-auto">
          {plan.days?.map((day, i) => (
            <button key={day.id} onClick={() => { setActiveDay(i); setDone(new Set()); }}
              className={clsx("flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeDay === i ? "bg-brand-500 text-white shadow-brand" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}>
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500 rounded-full bg-brand-500"
              style={{ width: `${exercises.length > 0 ? (done.size / exercises.length) * 100 : 0}%` }} />
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400">{done.size}/{exercises.length}</span>
        </div>

        {exercises.length === 0 ? (
          <p className="py-8 text-sm text-center text-gray-400">Nenhum exercício neste dia.</p>
        ) : exercises.map(item => (
          <ExerciseCard key={item.id} item={item} done={done.has(item.id)}
            onToggle={toggleDone}
            onStartTimer={secs => setTimer({ seconds: secs })}
            onOpenDetail={setDetailItem}
          />
        ))}

        {allDone && (
          <button onClick={handleFinish} disabled={finishing} className="w-full py-4 mt-4 text-base btn-primary">
            {finishing
              ? <><span className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
              : "🏆 Concluir treino"
            }
          </button>
        )}
      </div>

      {timer      && <RestTimer seconds={timer.seconds} onDone={() => setTimer(null)} />}
      {detailItem && <ExerciseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
    </div>
  );
}