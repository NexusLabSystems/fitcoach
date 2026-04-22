// src/pages/student/WorkoutPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import { useLastLog }        from "@/hooks/useLastLog";
import { useAuth }           from "@/contexts/AuthContext";
import { addDoc, collection, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR }   from "date-fns/locale";
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

function tryParseJSON(str) {
  try { return str ? JSON.parse(str) : null; } catch { return null; }
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
            <circle cx="60" cy="60" r="54" fill="none" stroke="#3E564F" strokeWidth="8"
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
  const [editingLoad, setEditingLoad] = useState(false);
  const [collapsed, setCollapsed]     = useState(true);
  const ex      = item.exercise ?? {};
  const ytId    = getYouTubeId(ex.videoUrl);
  const thumb   = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;
  const numSets = Number(item.sets) || 1;
  const done    = (doneSetsForEx?.size ?? 0) >= numSets;

  useEffect(() => { if (done) setCollapsed(true); }, [done]);

  if (done && collapsed) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5 transition-all">
        <button onClick={() => { onToggleSet(item.id, [...(doneSetsForEx ?? [])].at(-1)); setCollapsed(false); }}
          className="flex items-center justify-center flex-shrink-0 transition-colors bg-green-500 rounded-full w-7 h-7 hover:bg-green-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <p className="text-sm font-semibold text-green-700">{ex.name ?? item.name}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
      <div className="flex gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="mb-2 text-sm font-bold text-gray-900">{ex.name ?? item.name}</p>
          <p className="text-xs text-gray-500 mb-0.5">
            Séries: {item.sets}/{item.reps}{item.rest ? `‑${item.rest}s` : ""}
          </p>
          <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
            <span>Carga:</span>
            {editingLoad ? (
              <input type="number" min="0" step="2.5" autoFocus
                value={loadValue} onChange={e => onLoadChange(item.id, e.target.value)}
                onBlur={() => setEditingLoad(false)}
                className="w-16 py-0.5 text-xs text-center input ml-1" />
            ) : (
              <>
                <span className="ml-1">{loadValue || item.load || "0"}kg</span>
                <button onClick={() => setEditingLoad(true)} className="text-brand-500 font-semibold ml-1.5">Editar</button>
              </>
            )}
          </div>
          {prevLoad && !editingLoad && (
            <p className="text-[11px] text-blue-400 mb-2">Última vez: {prevLoad} kg</p>
          )}
          <SetCircles id={item.id} numSets={numSets} doneSetsForEx={doneSetsForEx} onToggleSet={onToggleSet} done={false} />
          {item.rest > 0 && (
            <button onClick={() => onStartTimer(item.rest)}
              className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              {item.rest}s
            </button>
          )}
          {item.notes && <p className="mt-2 text-xs italic text-gray-400">💡 {item.notes}</p>}
        </div>

        {thumb && (
          <button onClick={() => onOpenDetail(item)} className="self-stretch flex-shrink-0 w-24 overflow-hidden rounded-xl">
            <div className="relative h-full min-h-[90px]">
              <img src={thumb} alt={ex.name} className="object-cover w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex items-center justify-center rounded-full w-7 h-7 bg-white/90">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#374151"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// ── SupersetCard ──────────────────────────────────────────────────
function SupersetCard({ item, doneSets, loads, onLoadChange, prevLoads, onToggleSet, onStartTimer, onOpenDetail }) {
  const badge = item.items.length === 2 ? "Bi-set" : "Tri-set";
  const allSubsDone = item.items.every(s => (doneSets[s.id]?.size ?? 0) >= (Number(s.sets) || 1));
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => { if (allSubsDone) setCollapsed(true); }, [allSubsDone]);

  if (allSubsDone && collapsed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5 transition-all">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => {
            const last = item.items.at(-1);
            onToggleSet(last.id, [...(doneSets[last.id] ?? [])].at(-1));
            setCollapsed(false);
          }} className="flex items-center justify-center flex-shrink-0 transition-colors bg-green-500 rounded-full w-7 h-7 hover:bg-green-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
          </button>
          <span className="text-xs font-bold tracking-wide text-green-600 uppercase">{badge}</span>
        </div>
        <div className="flex flex-col gap-1 pl-9">
          {item.items.map(s => (
            <p key={s.id} className="text-sm font-semibold text-green-700">{s.exercise?.name}</p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-orange-200 rounded-2xl">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-orange-100 bg-orange-50">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
        </svg>
        <span className="text-xs font-bold tracking-wider text-orange-600 uppercase">{badge}</span>
        <span className="ml-auto text-xs text-orange-400">Execute em sequência</span>
      </div>

      {item.items.map((sub, i) => {
        const numSets = Number(sub.sets) || 1;
        const isDone  = (doneSets[sub.id]?.size ?? 0) >= numSets;
        const ex      = sub.exercise ?? {};
        const ytId    = getYouTubeId(ex.videoUrl);
        const thumb   = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

        if (isDone) {
          return (
            <div key={sub.id} className={clsx("flex items-center gap-3 px-4 py-3 bg-green-50", i > 0 && "border-t border-gray-100")}>
              <button onClick={() => onToggleSet(sub.id, [...(doneSets[sub.id] ?? [])].at(-1))}
                className="flex items-center justify-center flex-shrink-0 w-6 h-6 transition-colors bg-green-500 rounded-full hover:bg-green-600">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              </button>
              <p className="text-sm font-semibold text-green-700">{ex.name}</p>
            </div>
          );
        }

        return (
          <div key={sub.id} className={clsx("flex gap-3 p-4", i > 0 && "border-t border-gray-100")}>
            <div className="flex-1 min-w-0">
              <p className="mb-2 text-sm font-bold text-gray-900">{ex.name}</p>
              <p className="text-xs text-gray-500 mb-0.5">
                Séries: {sub.sets}/{sub.reps}{item.rest ? `‑${item.rest}s` : ""}
              </p>
              <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
                <span>Carga:</span>
                <span className="ml-1">{loads[sub.id] || sub.load || "0"}kg</span>
                <button onClick={() => {
                  const v = window.prompt("Nova carga (kg):", loads[sub.id] || sub.load || "0");
                  if (v !== null) onLoadChange(sub.id, v);
                }} className="text-brand-500 font-semibold ml-1.5">Editar</button>
              </div>
              {prevLoads?.[sub.id] && (
                <p className="text-[11px] text-blue-400 mb-2">Última vez: {prevLoads[sub.id]} kg</p>
              )}
              <SetCircles id={sub.id} numSets={numSets} doneSetsForEx={doneSets[sub.id]} onToggleSet={onToggleSet} done={false} />
              {sub.notes && <p className="mt-2 text-xs italic text-gray-400">💡 {sub.notes}</p>}
            </div>
            {thumb && (
              <button onClick={() => onOpenDetail({ ...sub, rest: item.rest })} className="self-stretch flex-shrink-0 w-20 overflow-hidden rounded-xl">
                <div className="relative h-full min-h-[80px]">
                  <img src={thumb} alt={ex.name} className="object-cover w-full h-full" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/90">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#374151"><path d="M5 3l14 9-14 9V3z"/></svg>
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>
        );
      })}

      {item.rest > 0 && (
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
const CONFETTI_COLORS = ["#3E564F","#4CAF50","#3B82F6","#FFC107","#A855F7","#EC4899","#14B8A6"];
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
      <p className="mb-3 text-xs font-semibold text-center text-gray-500 capitalize">{monthName}</p>
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
    const now = new Date();
    getDocs(query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid)
    )).then(snap => {
      const days = new Set([now.getDate()]); // inclui hoje (recém salvo)
      snap.docs.forEach(d => {
        const date = d.data().date?.toDate?.();
        if (date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          days.add(date.getDate());
        }
      });
      setWorkoutDays(days);
    }).catch(() => {});
  }, [profile?.uid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {/* Confetti */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
        <div className="mb-4 text-center">
          <div className="mb-2 text-5xl">🏆</div>
          <h2 className="text-xl font-bold text-gray-900 mb-0.5">Treino concluído!</h2>
          <p className="text-sm text-gray-400">{stats.dayLabel} — arrasou demais!</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 text-center bg-brand-50 rounded-2xl">
            <p className="text-2xl font-bold text-brand-600">{stats.totalSets}</p>
            <p className="text-xs text-brand-400 mt-0.5">Séries</p>
          </div>
          <div className="p-3 text-center bg-green-50 rounded-2xl">
            <p className="text-2xl font-bold text-green-600">{stats.exercises}</p>
            <p className="text-xs text-green-400 mt-0.5">Exercícios</p>
          </div>
          <div className="p-3 text-center bg-orange-50 rounded-2xl">
            <p className="text-2xl font-bold text-orange-500">
              {stats.durationSeconds
                ? `${Math.floor(stats.durationSeconds / 60)}min`
                : "—"}
            </p>
            <p className="text-xs text-orange-400 mt-0.5">Duração</p>
          </div>
        </div>

        {/* Calendário do mês */}
        <div className="p-4 mb-5 border border-gray-100 rounded-2xl bg-gray-50">
          <MonthCalendar workoutDays={workoutDays} />
          <p className="text-[10px] text-gray-400 text-center mt-3">
            {workoutDays.size} {workoutDays.size === 1 ? "treino" : "treinos"} este mês
          </p>
        </div>

        <button onClick={onClose} className="w-full py-3 text-base btn-primary">
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Card de seleção de dia ────────────────────────────────────────
function DayCard({ day, count, lastDate, onView }) {
  const muscles = [...new Set(
    (day.exercises ?? []).flatMap(ex =>
      ex.type === "superset"
        ? ex.items.map(s => s.exercise?.muscleGroup).filter(Boolean)
        : [ex.exercise?.muscleGroup].filter(Boolean)
    )
  )];

  return (
    <div className="overflow-hidden card">
      <div className="p-4 pb-3">
        <h3 className="text-base font-bold text-gray-900">{day.label}</h3>
        {muscles.length > 0 && (
          <p className="text-sm text-gray-500 mt-0.5">{muscles.join(" / ")}</p>
        )}
        {lastDate ? (
          <p className="mt-2 text-xs font-medium text-blue-500">Último treino concluído em: {lastDate}</p>
        ) : (
          <p className="mt-2 text-xs text-gray-400">Nenhum treino registrado ainda</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 pb-3">
        <div className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          Histórico
          {count > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{count}</span>
          )}
        </div>
        <div className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Evolução
        </div>
      </div>

      <div className="px-4 pb-4">
        <button onClick={onView} className="w-full py-3 btn-primary font-bold text-sm">
          VER TREINO
        </button>
      </div>
    </div>
  );
}

// ── Card de exercício na prévia ───────────────────────────────────
function PreviewExCard({ item, badge, fullWidth = false }) {
  const ex     = item.exercise ?? {};
  const ytId   = getYouTubeId(ex.videoUrl);
  const thumb  = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  return (
    <div className={clsx("bg-white rounded-2xl border border-gray-200 p-4 flex-shrink-0", fullWidth ? "w-full" : "w-52")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-bold leading-tight text-gray-900">{ex.name ?? item.name}</p>
        {badge && (
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-xs font-bold text-white rounded-full bg-brand-500">
            {badge}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-0.5">
        Séries: {item.sets}/{item.reps}{item.rest ? `‑${item.rest}s` : ""}
      </p>
      <p className="mb-3 text-xs text-gray-500">Carga: {item.load ? `${item.load}kg` : "0kg"}</p>
      {thumb ? (
        <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "16/9" }}>
          <img src={thumb} alt={ex.name} className="object-cover w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/90">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#374151"><path d="M5 3l14 9-14 9V3z"/></svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center bg-gray-100 rounded-xl" style={{ aspectRatio: "16/9" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Grupo de exercícios na prévia ─────────────────────────────────
function PreviewItem({ item }) {
  if (item.type === "superset") {
    return (
      <div>
        <p className="text-sm font-bold text-gray-900 mb-0.5">Exercícios combinados</p>
        <p className="mb-3 text-xs text-gray-400">Alterne esses exercícios</p>
        <div className="flex gap-3 px-5 pb-2 -mx-5 overflow-x-auto scrollbar-none">
          {item.items.map((s, i) => (
            <PreviewExCard key={s.id} item={s} badge={String.fromCharCode(65 + i)} />
          ))}
        </div>
      </div>
    );
  }
  return <PreviewExCard item={item} fullWidth />;
}

// ── Página principal ──────────────────────────────────────────────
export default function WorkoutPage() {
  const { profile }       = useAuth();
  const { plan, loading } = useStudentWorkout();
  const navigate          = useNavigate();
  const location          = useLocation();
  const autostartRef      = useRef(location.state?.autostart ?? false);
  const [viewMode, setViewMode]     = useState("selection"); // "selection" | "preview" | "workout"
  const [activeDay, setActiveDay]   = useState(0);
  const [doneSets, setDoneSets]     = useState({}); // { [exerciseId]: Set<number> }

  // Inicializa no próximo dia após o último treino concluído
  useEffect(() => {
    if (!plan?.id || !profile?.uid) return;
    const validDays = plan.days?.filter(d => d.exercises?.length > 0) ?? [];
    if (!validDays.length) return;

    getDocs(query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid),
      where("planId",    "==", plan.id)
    )).then(snap => {
      let nextValid;
      if (snap.empty) {
        nextValid = validDays[0];
      } else {
        const sorted = snap.docs
          .map(d => d.data())
          .sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
        const lastIndex = validDays.findIndex(d => d.label === sorted[0].dayLabel);
        nextValid = validDays[(lastIndex === -1 ? 0 : lastIndex + 1) % validDays.length];
      }
      const nextDayIndex = plan.days.indexOf(nextValid);
      setActiveDay(nextDayIndex);

      // Restaura sessão salva (evita perder tela ao refresh ou voltar da navegação)
      const session = tryParseJSON(localStorage.getItem(`fitcoach_session_${plan.id}`));
      if (session?.activeDay === nextDayIndex) {
        if (session.viewMode === "workout") {
          const wkKey = `fitcoach_wk_${plan.id}_${nextValid?.id}`;
          const saved = tryParseJSON(localStorage.getItem(wkKey));
          const hasProgress = Object.values(saved?.doneSets ?? {}).some(v => Array.isArray(v) && v.length > 0);
          if (hasProgress) { setViewMode("workout"); return; }
        } else if (session.viewMode === "preview") {
          setViewMode("preview"); return;
        }
      }

      // Veio do dashboard com "Iniciar treino" → vai direto para a prévia
      if (autostartRef.current) {
        autostartRef.current = false;
        setViewMode("preview");
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id, profile?.uid]);
  const [loads, setLoads]           = useState({});
  const [timer, setTimer]           = useState(null);
  const [finishing, setFinishing]     = useState(false);
  const [detailItem, setDetailItem]   = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [elapsed, setElapsed]         = useState(0);
  const [perDayCount, setPerDayCount] = useState({});
  const [perDayDates, setPerDayDates] = useState({});
  const wakeLockRef                 = useRef(null);
  const workoutStartRef             = useRef(null);
  const timerIntervalRef            = useRef(null);
  const notifTimeoutRef             = useRef(null);

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

  // ── Persiste sessão para restaurar após refresh ou navegação ────
  useEffect(() => {
    if (!plan?.id) return;
    localStorage.setItem(`fitcoach_session_${plan.id}`, JSON.stringify({ viewMode, activeDay }));
  }, [viewMode, activeDay, plan?.id]);

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

  // ── Contagem de execuções por dia ──────────────────────────────
  useEffect(() => {
    if (!plan?.id || !profile?.uid) return;
    getDocs(query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid),
      where("planId",    "==", plan.id)
    )).then(snap => {
      const counts = {};
      const dates  = {};
      snap.docs.forEach(d => {
        const { dayLabel, date } = d.data();
        if (!dayLabel) return;
        counts[dayLabel] = (counts[dayLabel] ?? 0) + 1;
        const ts = date?.seconds ?? 0;
        if (!dates[dayLabel] || ts > dates[dayLabel].ts) {
          const dt = date?.toDate ? date.toDate() : new Date(date);
          dates[dayLabel] = { ts, formatted: format(dt, "dd/MM/yyyy", { locale: ptBR }) };
        }
      });
      setPerDayCount(counts);
      setPerDayDates(Object.fromEntries(Object.entries(dates).map(([k, v]) => [k, v.formatted])));
    }).catch(() => {});
  }, [plan?.id, profile?.uid]);

  // ── Cronômetro — só roda no modo workout, isolado por dia ────────
  useEffect(() => {
    if (!plan?.id || !currentDay?.id || viewMode !== "workout") {
      clearInterval(timerIntervalRef.current);
      return;
    }

    const key = `fitcoach_start_${plan.id}_${currentDay.id}`;
    let startAt = parseInt(localStorage.getItem(key), 10);

    // Descarta timers com mais de 4 horas (provavelmente esquecido aberto)
    if (startAt && Date.now() - startAt > 4 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      startAt = NaN;
    }

    if (!startAt || isNaN(startAt)) {
      startAt = Date.now();
      localStorage.setItem(key, String(startAt));
    }

    workoutStartRef.current = startAt;
    setElapsed(Math.floor((Date.now() - startAt) / 1000));

    timerIntervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - workoutStartRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [plan?.id, currentDay?.id, viewMode]);

  function formatElapsed(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── Notificação de lembrete (90 min) ────────────────────────────
  useEffect(() => {
    if (viewMode !== "workout") {
      clearTimeout(notifTimeoutRef.current);
      return;
    }
    if (!("Notification" in window)) return;

    async function scheduleNotif() {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission !== "granted") return;

      clearTimeout(notifTimeoutRef.current);
      notifTimeoutRef.current = setTimeout(() => {
        new Notification("Ei, não esqueça de concluir o seu treino! 💪", {
          body: `Você ainda tem séries pendentes no ${currentDay?.label ?? "treino de hoje"}. Bora finalizar!`,
          icon: "/icon-192.png",
        });
      }, 90 * 60 * 1000);
    }

    scheduleNotif();
    return () => clearTimeout(notifTimeoutRef.current);
  }, [viewMode, currentDay?.label]);

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
      const completedExs = leafExs.filter(e => (doneSets[e.id]?.size ?? 0) >= e.sets).length;
      await addDoc(collection(db, "workoutLogs"), {
        studentId:       profile.uid,
        planId:          plan.id,
        dayLabel:        currentDay.label,
        exercisesDone:   completedExs,
        totalExercises:  leafExs.length,
        loads,
        durationSeconds: elapsed,
        date:            serverTimestamp(),
      });
      clearInterval(timerIntervalRef.current);
      clearTimeout(notifTimeoutRef.current);
      // Limpa progresso, hora de início e sessão salvos
      localStorage.removeItem(`fitcoach_wk_${plan.id}_${currentDay.id}`);
      localStorage.removeItem(`fitcoach_start_${plan.id}_${currentDay.id}`);
      localStorage.removeItem(`fitcoach_session_${plan.id}`);
      setCelebration({ totalSets: completedSets, exercises: completedExs, totalExercises: leafExs.length, dayLabel: currentDay.label, durationSeconds: elapsed });
      workoutStartRef.current = null;
      setElapsed(0);
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

  // ── Vista: seleção de dia ─────────────────────────────────────────
  if (viewMode === "selection") {
    const validDays = plan.days?.filter(d => d.exercises?.length > 0) ?? [];
    return (
      <div className="min-h-screen" style={{ overscrollBehavior: "contain" }}>
        <div className="px-5 pt-12 pb-5 bg-white border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-0.5">Olá, {profile?.name?.split(" ")[0]}</p>
          <h1 className="text-xl font-semibold text-gray-900 truncate">{plan.name}</h1>
          <p className="mt-1 text-sm text-gray-400">{validDays.length} dia{validDays.length !== 1 ? "s" : ""} de treino</p>
        </div>
        <div className="flex flex-col gap-3 p-5">
          {validDays.map(day => {
            const realIndex = plan.days.indexOf(day);
            return (
              <DayCard
                key={day.id}
                day={day}
                count={perDayCount[day.label] ?? 0}
                lastDate={perDayDates[day.label] ?? null}
                onView={() => { setActiveDay(realIndex); setViewMode("preview"); }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Vista: prévia do dia ──────────────────────────────────────────
  if (viewMode === "preview") {
    const muscles = [...new Set(
      (currentDay?.exercises ?? []).flatMap(ex =>
        ex.type === "superset"
          ? ex.items.map(s => s.exercise?.muscleGroup).filter(Boolean)
          : [ex.exercise?.muscleGroup].filter(Boolean)
      )
    )];

    return (
      <div className="min-h-screen pb-10 bg-gray-50" style={{ overscrollBehavior: "contain" }}>
        {/* Cabeçalho */}
        <div className="px-5 pt-12 pb-5 bg-white border-b border-gray-100">
          <button onClick={() => setViewMode("selection")} className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 -ml-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            Voltar
          </button>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-tight text-gray-900">
              {muscles.length > 0 ? muscles.join("/") : currentDay?.label}
            </h1>
          </div>
        </div>

        {/* Botão INICIAR + hint */}
        <div className="px-5 pt-5 pb-4 bg-white">
          <button onClick={() => setViewMode("workout")} className="w-full py-4 text-base font-bold tracking-wide btn-primary">
            INICIAR
          </button>
          <p className="mt-3 text-xs leading-relaxed text-center text-gray-400">
            Você está no <span className="font-semibold text-gray-600">"modo visualização"</span>.<br/>
            Aperte INICIAR para começar seu treino.
          </p>
        </div>

        {/* Lista de exercícios */}
        <div className="flex flex-col gap-6 p-5">
          {exercises.map(item => <PreviewItem key={item.id} item={item} />)}
        </div>
      </div>
    );
  }

  // ── Vista: treino ativo ───────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ overscrollBehavior: "contain" }}>
      <div className="px-5 pt-12 pb-4 bg-white border-b border-gray-100">
        <button onClick={() => setViewMode("selection")} className="flex items-center gap-1.5 text-sm text-gray-500 mb-3 -ml-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Trocar treino
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Olá, {profile?.name?.split(" ")[0]} 👋</p>
            <h1 className="text-lg font-semibold text-gray-900">{currentDay?.label}</h1>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-brand-500 tabular-nums">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            {formatElapsed(elapsed)}
          </span>
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

        {isWorkoutActive && (
          <button onClick={handleFinish} disabled={finishing}
            className={clsx("w-full py-4 mt-4 text-base btn-primary", !allDone && "opacity-80")}>
            {finishing
              ? <><span className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
              : allDone ? "🏆 Concluir treino" : "Concluir treino"
            }
          </button>
        )}
      </div>

      {timer       && <RestTimer seconds={timer.seconds} onDone={() => setTimer(null)} />}
      {detailItem  && <ExerciseDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      {celebration && <CelebrationModal stats={celebration} onClose={() => { setCelebration(null); setViewMode("selection"); navigate("/student"); }} />}
    </div>
  );
}
