// src/pages/student/StudentHome.jsx
import { useState, useEffect, useRef } from "react";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import { useLastLog }        from "@/hooks/useLastLog";
import { useAuth }           from "@/contexts/AuthContext";
import { addDoc, collection, serverTimestamp, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast  from "react-hot-toast";
import clsx   from "clsx";

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ── Helpers de séries ──────────────────────────────────────────────
/** Retorna array de { id, sets } para todos os exercícios folha */
function collectLeafExercises(exercises) {
  const result = [];
  for (const item of exercises) {
    if (item.type === "superset") {
      item.items.forEach(s => result.push({ id: s.id, sets: Number(s.sets) || 1 }));
    } else {
      result.push({ id: item.id, sets: Number(item.sets) || 1 });
    }
  }
  return result;
}

function serializeDoneSets(ds) {
  const out = {};
  for (const [k, v] of Object.entries(ds)) out[k] = [...v];
  return out;
}

function deserializeDoneSets(ds) {
  const out = {};
  for (const [k, v] of Object.entries(ds ?? {})) out[k] = new Set(v);
  return out;
}

// ── Beep + vibrate ao fim do descanso ────────────────────────────
function beep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

// ── Timer de descanso (modal) ─────────────────────────────────────
function RestTimer({ seconds, onDone }) {
  const [remaining, setRemaining] = useState(seconds);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(ref.current);
          beep();
          if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
          onDone();
          return 0;
        }
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

// ── Modal de detalhes do exercício ────────────────────────────────
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

// ── Círculos de séries ────────────────────────────────────────────
function SetCircles({ id, numSets, doneSetsForEx, onToggleSet, done }) {
  return (
    <div className="flex gap-1.5 mt-3">
      {[...Array(numSets)].map((_, i) => {
        const checked = doneSetsForEx?.has(i) ?? false;
        return (
          <button key={i} onClick={() => onToggleSet(id, i)}
            className={clsx(
              "w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all",
              checked
                ? "border-green-500 bg-green-500 text-white"
                : done
                  ? "border-green-200 bg-green-50 text-green-300"
                  : "border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-400"
            )}>
            {checked
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : i + 1
            }
          </button>
        );
      })}
    </div>
  );
}

// ── Cartão de exercício regular ───────────────────────────────────
function ExerciseCard({ item, doneSetsForEx, loadValue, onLoadChange, prevLoad, onToggleSet, onStartTimer, onOpenDetail }) {
  const [effort, setEffort] = useState(0);
  const ex       = item.exercise ?? {};
  const hasVideo = !!getYouTubeId(ex.videoUrl);
  const numSets  = Number(item.sets) || 1;
  const done     = (doneSetsForEx?.size ?? 0) >= numSets;

  return (
    <div className={clsx("rounded-2xl border transition-all overflow-hidden", done ? "border-green-200 bg-green-50" : "border-gray-200 bg-white")}>
      <div className="flex items-start gap-3 p-4 pb-2">
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

      {/* Círculos de séries — sempre visíveis */}
      <div className="px-4 pb-3">
        <SetCircles id={item.id} numSets={numSets} doneSetsForEx={doneSetsForEx} onToggleSet={onToggleSet} done={done} />
      </div>

      {!done && (
        <div className="flex flex-col gap-3 px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex flex-col flex-1 gap-0.5">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">Carga (kg)</label>
                <input type="number" min="0" step="2.5"
                  value={loadValue}
                  onChange={e => onLoadChange(item.id, e.target.value)}
                  placeholder={item.load || "0"}
                  className="w-20 py-1 text-sm text-center input" />
              </div>
              {prevLoad && (
                <p className="text-[11px] text-blue-400 pl-[60px]">Última vez: {prevLoad} kg</p>
              )}
            </div>
            {item.rest > 0 && (
              <button onClick={() => onStartTimer(item.rest)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors flex-shrink-0">
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

// ── SupersetCard ──────────────────────────────────────────────────
function SubLoad({ subId, loadValue, onLoadChange, prevLoad }) {
  return (
    <div className="flex flex-col gap-0.5 mt-2">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400 whitespace-nowrap">Carga (kg)</label>
        <input type="number" min="0" step="2.5"
          value={loadValue}
          onChange={e => onLoadChange(subId, e.target.value)}
          placeholder="0"
          className="w-20 py-1 text-sm text-center input" />
      </div>
      {prevLoad && (
        <p className="text-[11px] text-blue-400 pl-[60px]">Última vez: {prevLoad} kg</p>
      )}
    </div>
  );
}

function SupersetCard({ item, doneSets, loads, onLoadChange, prevLoads, onToggleSet, onStartTimer, onOpenDetail }) {
  const badge = item.items.length === 2 ? "Bi-set" : "Tri-set";
  const allSubsDone = item.items.every(s => {
    const numSets = Number(s.sets) || 1;
    return (doneSets[s.id]?.size ?? 0) >= numSets;
  });

  return (
    <div className={clsx("rounded-2xl border overflow-hidden transition-all",
      allSubsDone ? "border-green-200 bg-green-50" : "border-orange-200 bg-white"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-orange-50 border-orange-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <span className="text-xs font-bold tracking-wider text-orange-600 uppercase">{badge}</span>
        <span className="ml-auto text-xs text-orange-400">Execute em sequência</span>
      </div>

      {/* Sub-exercises */}
      {item.items.map((sub, i) => {
        const numSets  = Number(sub.sets) || 1;
        const isDone   = (doneSets[sub.id]?.size ?? 0) >= numSets;
        const ex       = sub.exercise ?? {};
        const hasVideo = !!getYouTubeId(ex.videoUrl);
        return (
          <div key={sub.id} className={clsx("px-4 py-3", i > 0 && "border-t border-gray-100")}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={clsx("text-sm font-semibold", isDone ? "text-green-700 line-through" : "text-gray-900")}>
                    {ex.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-400">{sub.sets}×{sub.reps}</span>
                    <button onClick={() => onOpenDetail({ ...sub, rest: item.rest })}
                      className={clsx("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
                        hasVideo ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}>
                      {hasVideo
                        ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>Ver</>
                        : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>Info</>
                      }
                    </button>
                  </div>
                </div>

                {/* Círculos de séries do sub-exercício */}
                <SetCircles id={sub.id} numSets={numSets} doneSetsForEx={doneSets[sub.id]} onToggleSet={onToggleSet} done={isDone} />

                {!isDone && (
                  <SubLoad
                    subId={sub.id}
                    loadValue={loads[sub.id] ?? ""}
                    onLoadChange={onLoadChange}
                    prevLoad={prevLoads?.[sub.id]}
                  />
                )}
                {!isDone && sub.notes && <p className="mt-1 text-xs italic text-gray-400">💡 {sub.notes}</p>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Botão de descanso */}
      {!allSubsDone && item.rest > 0 && (
        <div className="px-4 py-3 border-t border-orange-100 bg-orange-50">
          <button onClick={() => onStartTimer(item.rest)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Descanso: {item.rest}s
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tela de celebração ───────────────────────────────────────────
const CONFETTI_COLORS = ["#FF5722","#4CAF50","#3B82F6","#FFC107","#A855F7","#EC4899","#14B8A6"];
const DAY_LABELS_PT   = ["S","T","Q","Q","S","S","D"]; // Seg→Dom

function MonthCalendar({ workoutDays }) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const today       = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Offset para semana começar na segunda (0=Dom → offset 6, 1=Seg → offset 0, ...)
  const rawFirst    = new Date(year, month, 1).getDay();
  const startOffset = (rawFirst + 6) % 7;
  const monthName   = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 capitalize text-center mb-3">{monthName}</p>
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5">
        {DAY_LABELS_PT.map((l, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
        ))}
        {cells.map((d, i) => {
          const isWorkout = d && workoutDays.has(d);
          const isToday   = d === today;
          return (
            <div key={i} className={clsx(
              "aspect-square flex items-center justify-center rounded-full text-[11px] font-medium mx-auto w-7 h-7",
              !d           ? "" :
              isWorkout    ? "bg-brand-500 text-white" :
              isToday      ? "border-2 border-brand-400 text-brand-500" :
                             "text-gray-400"
            )}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CelebrationModal({ stats, onClose }) {
  const { profile } = useAuth();
  const [workoutDays, setWorkoutDays] = useState(() => new Set([new Date().getDate()]));

  const particles = useRef(
    Array.from({ length: 42 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.4,
      duration: 1.8 + Math.random() * 1.6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 8,
      circle: Math.random() > 0.5,
    }))
  ).current;

  // Busca os dias do mês atual em que o aluno treinou
  useEffect(() => {
    if (!profile?.uid) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    getDocs(query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    )).then(snap => {
      const days = new Set([now.getDate()]); // inclui hoje (recém salvo)
      snap.docs.forEach(d => {
        const date = d.data().date?.toDate?.();
        if (date) days.add(date.getDate());
      });
      setWorkoutDays(days);
    }).catch(() => {});
  }, [profile?.uid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-12px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.circle ? "50%" : "2px",
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }} />
        ))}
      </div>

      {/* Card */}
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">🏆</div>
          <h2 className="text-xl font-bold text-gray-900 mb-0.5">Treino concluído!</h2>
          <p className="text-sm text-gray-400">{stats.dayLabel} — arrasou demais!</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-brand-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-600">{stats.totalSets}</p>
            <p className="text-xs text-brand-400 mt-0.5">Séries feitas</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.exercises}</p>
            <p className="text-xs text-green-400 mt-0.5">Exercícios</p>
          </div>
        </div>

        {/* Calendário do mês */}
        <div className="border border-gray-100 rounded-2xl p-4 mb-5 bg-gray-50">
          <MonthCalendar workoutDays={workoutDays} />
          <p className="text-[10px] text-gray-400 text-center mt-3">
            {workoutDays.size} {workoutDays.size === 1 ? "treino" : "treinos"} este mês
          </p>
        </div>

        <button onClick={onClose} className="btn-primary w-full py-3 text-base">
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function StudentHome() {
  const { profile }       = useAuth();
  const { plan, loading } = useStudentWorkout();
  const [activeDay, setActiveDay]   = useState(0);
  const [doneSets, setDoneSets]     = useState({}); // { [exerciseId]: Set<number> }
  const [loads, setLoads]           = useState({});
  const [timer, setTimer]           = useState(null);
  const [finishing, setFinishing]     = useState(false);
  const [detailItem, setDetailItem]   = useState(null);
  const [celebration, setCelebration] = useState(null);
  const wakeLockRef                 = useRef(null);

  const currentDay = plan?.days?.[activeDay];
  const exercises  = currentDay?.exercises ?? [];
  const leafExs    = collectLeafExercises(exercises);
  const totalSets  = leafExs.reduce((sum, e) => sum + e.sets, 0);
  const completedSets = leafExs.reduce((sum, e) => sum + (doneSets[e.id]?.size ?? 0), 0);
  const allDone    = leafExs.length > 0 && leafExs.every(e => (doneSets[e.id]?.size ?? 0) >= e.sets);
  const isWorkoutActive = completedSets > 0;

  // Busca último log com cargas para o dia atual
  const lastLog = useLastLog(plan?.id, currentDay?.label);

  // ── localStorage: carregar ao trocar dia ────────────────────────
  useEffect(() => {
    if (!plan?.id || !currentDay?.id) return;
    const key = `fitcoach_wk_${plan.id}_${currentDay.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const { doneSets: ds, loads: l } = JSON.parse(saved);
        setDoneSets(deserializeDoneSets(ds));
        setLoads(l ?? {});
        return;
      } catch (_) {}
    }
    // Sem save: inicializa cargas do plano
    setDoneSets({});
    const init = {};
    for (const item of exercises) {
      if (item.type === "superset") {
        item.items.forEach(s => { init[s.id] = s.load ?? ""; });
      } else {
        init[item.id] = item.load ?? "";
      }
    }
    setLoads(init);
  }, [plan?.id, currentDay?.id]);

  // ── localStorage: salvar ao alterar estado ──────────────────────
  useEffect(() => {
    if (!plan?.id || !currentDay?.id) return;
    const key = `fitcoach_wk_${plan.id}_${currentDay.id}`;
    localStorage.setItem(key, JSON.stringify({
      doneSets: serializeDoneSets(doneSets),
      loads,
    }));
  }, [doneSets, loads, plan?.id, currentDay?.id]);

  // ── Screen Wake Lock ────────────────────────────────────────────
  useEffect(() => {
    if (!("wakeLock" in navigator) || !isWorkoutActive) return;

    let lock = null;
    navigator.wakeLock.request("screen")
      .then(l => { lock = l; wakeLockRef.current = l; })
      .catch(() => {});

    function handleVisibility() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        navigator.wakeLock.request("screen")
          .then(l => { lock = l; wakeLockRef.current = l; })
          .catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      lock?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [isWorkoutActive]);

  function toggleSet(id, setIdx) {
    setDoneSets(prev => {
      const current = new Set(prev[id] ?? []);
      current.has(setIdx) ? current.delete(setIdx) : current.add(setIdx);
      return { ...prev, [id]: current };
    });
  }

  function setLoad(id, value) {
    setLoads(prev => ({ ...prev, [id]: value }));
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await addDoc(collection(db, "workoutLogs"), {
        studentId:     profile.uid,
        planId:        plan.id,
        dayLabel:      currentDay.label,
        exercisesDone: leafExs.length,
        loads,
        date:          serverTimestamp(),
      });
      // Limpa progresso salvo
      localStorage.removeItem(`fitcoach_wk_${plan.id}_${currentDay.id}`);
      setCelebration({ totalSets: completedSets, exercises: leafExs.length, dayLabel: currentDay.label });
      setDoneSets({});
      // Reinicializa cargas do plano
      const init = {};
      for (const item of exercises) {
        if (item.type === "superset") {
          item.items.forEach(s => { init[s.id] = s.load ?? ""; });
        } else {
          init[item.id] = item.load ?? "";
        }
      }
      setLoads(init);
    } catch { toast.error("Erro ao salvar treino."); }
    finally  { setFinishing(false); }
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
            <button key={day.id} onClick={() => setActiveDay(i)}
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
              style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }} />
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400">{completedSets}/{totalSets} séries</span>
        </div>

        {exercises.length === 0 ? (
          <p className="py-8 text-sm text-center text-gray-400">Nenhum exercício neste dia.</p>
        ) : exercises.map(item =>
          item.type === "superset" ? (
            <SupersetCard key={item.id} item={item}
              doneSets={doneSets}
              loads={loads}
              onLoadChange={setLoad}
              prevLoads={lastLog?.loads}
              onToggleSet={toggleSet}
              onStartTimer={secs => setTimer({ seconds: secs })}
              onOpenDetail={setDetailItem}
            />
          ) : (
            <ExerciseCard key={item.id} item={item}
              doneSetsForEx={doneSets[item.id]}
              loadValue={loads[item.id] ?? ""}
              onLoadChange={setLoad}
              prevLoad={lastLog?.loads?.[item.id]}
              onToggleSet={toggleSet}
              onStartTimer={secs => setTimer({ seconds: secs })}
              onOpenDetail={setDetailItem}
            />
          )
        )}

        {allDone && (
          <button onClick={handleFinish} disabled={finishing} className="w-full py-4 mt-4 text-base btn-primary">
            {finishing
              ? <><span className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
              : "🏆 Concluir treino"
            }
          </button>
        )}
      </div>

      {timer       && <RestTimer seconds={timer.seconds} onDone={() => setTimer(null)} />}
      {detailItem  && <ExerciseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      {celebration && <CelebrationModal stats={celebration} onClose={() => setCelebration(null)} />}
    </div>
  );
}
