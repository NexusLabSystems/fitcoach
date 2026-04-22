// src/pages/student/StudentProgress.jsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db }                   from "@/lib/firebase";
import { useAuth }              from "@/contexts/AuthContext";
import { useStudentWorkout }    from "@/hooks/useStudentWorkout";
import { format }               from "date-fns";
import { ptBR }                 from "date-fns/locale";
import clsx                     from "clsx";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

// ── Frequência semanal (últimas 8 semanas) ────────────────────────
function getWeekStart(date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7; // dias desde segunda
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function WeeklyFrequency({ logs }) {
  const now           = new Date();
  const thisWeekStart = getWeekStart(now);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisWeekStart);
    start.setDate(thisWeekStart.getDate() - (7 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const count = logs.filter(l => {
      const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
      return d >= start && d <= end;
    }).length;

    return {
      label: format(start, "dd/MM", { locale: ptBR }),
      count,
      isCurrent: i === 7,
    };
  });

  const maxCount = Math.max(...weeks.map(w => w.count), 1);

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-gray-900 mb-4">Frequência semanal</p>
      <div className="flex items-end gap-1.5 h-20">
        {weeks.map((w, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {w.count > 0 && (
              <p className={clsx("text-[10px] font-semibold", w.isCurrent ? "text-brand-600" : "text-gray-400")}>
                {w.count}
              </p>
            )}
            <div className="w-full flex items-end" style={{ height: "52px" }}>
              <div
                className={clsx("w-full rounded-t-md transition-all", w.isCurrent ? "bg-brand-500" : "bg-brand-200")}
                style={{ height: w.count > 0 ? `${Math.max((w.count / maxCount) * 52, 6)}px` : "3px", opacity: w.count === 0 ? 0.3 : 1 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {weeks.map((w, i) => (
          <p key={i} className={clsx("flex-1 text-center text-[9px]", w.isCurrent ? "text-brand-500 font-semibold" : "text-gray-300")}>
            {w.label}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Calendário mensal de frequência ──────────────────────────────
const DAY_LABELS_PT = ["S","T","Q","Q","S","S","D"];

function MonthCalendar({ logs }) {
  const now         = new Date();
  const year        = now.getFullYear();
  const month       = now.getMonth();
  const today       = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthName   = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const workoutDays = new Set(
    logs
      .map(l => l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0))
      .filter(d => d.getMonth() === month && d.getFullYear() === year)
      .map(d => d.getDate())
  );

  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3 capitalize">{monthName}</p>
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 mb-1">
        {DAY_LABELS_PT.map((l, i) => (
          <div key={i} className="text-center text-[10px] text-gray-400 font-medium pb-1">{l}</div>
        ))}
        {cells.map((d, i) => {
          const isWorkout = d && workoutDays.has(d);
          const isToday   = d === today;
          return (
            <div key={i} className={clsx(
              "mx-auto w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-medium",
              !d        ? "" :
              isWorkout ? "bg-brand-500 text-white" :
              isToday   ? "border-2 border-brand-400 text-brand-500" :
                          "text-gray-400"
            )}>
              {d}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-1">
        {workoutDays.size} {workoutDays.size === 1 ? "treino" : "treinos"} este mês
      </p>
    </div>
  );
}

// ── Evolução de carga por exercício (agrupado por categoria) ─────
function LoadEvolution({ logs, nameMap }) {
  const [collapsed, setCollapsed] = useState(new Set());

  function toggleGroup(group) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  // Agrupa histórico de cargas por exercício
  const loadHistory = {};
  logs.forEach(log => {
    if (!log.loads) return;
    const date = log.date?.toDate ? log.date.toDate() : new Date(log.date ?? 0);
    Object.entries(log.loads).forEach(([exId, value]) => {
      if (!value && value !== 0) return;
      if (!loadHistory[exId]) loadHistory[exId] = [];
      loadHistory[exId].push({ date, value: Number(value) });
    });
  });

  // Monta entries com nome e categoria
  const entries = Object.entries(loadHistory)
    .filter(([id]) => nameMap[id])
    .map(([id, history]) => ({
      id,
      name:        nameMap[id].name,
      muscleGroup: nameMap[id].muscleGroup,
      history:     history.sort((a, b) => a.date - b.date),
    }))
    .filter(e => e.history.length > 0);

  if (entries.length === 0) return null;

  // Agrupa por categoria
  const grouped = {};
  entries.forEach(e => {
    const g = e.muscleGroup || "Outros";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(e);
  });
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Evolução de carga</p>
      </div>

      {sortedGroups.map(([group, exEntries], gi) => {
        const isCollapsed = collapsed.has(group);
        return (
          <div key={group} className={clsx(gi > 0 && "border-t border-gray-100")}>
            {/* Cabeçalho da categoria */}
            <button onClick={() => toggleGroup(group)}
              className="w-full px-4 py-2.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-[11px] font-bold text-brand-500 uppercase tracking-wide">{group}</span>
              <span className="text-[10px] text-gray-400">· {exEntries.length} {exEntries.length === 1 ? "exercício" : "exercícios"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3E564F" strokeWidth="2.5" strokeLinecap="round"
                className={clsx("ml-auto flex-shrink-0 transition-transform", isCollapsed && "-rotate-90")}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {exEntries.map(({ id, name, history }) => {
                  const first  = history[0].value;
                  const last   = history[history.length - 1].value;
                  const delta  = last - first;
                  const recent = history.slice(-6);
                  const maxVal = Math.max(...recent.map(h => h.value), 1);
                  return (
                    <div key={id} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                        {history.length > 1 && (
                          <span className={clsx(
                            "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                            delta > 0 ? "bg-green-100 text-green-700" :
                            delta < 0 ? "bg-red-100 text-red-600"     : "bg-gray-100 text-gray-500"
                          )}>
                            {delta > 0 ? "+" : ""}{delta} kg
                          </span>
                        )}
                      </div>
                      <div className="flex items-end gap-1 h-10 mb-2">
                        {recent.map((h, i) => (
                          <div key={i} className="flex-1">
                            <div className={clsx("w-full rounded-t-sm transition-all",
                              i === recent.length - 1 ? "bg-brand-500" : "bg-brand-200"
                            )} style={{ height: `${Math.max((h.value / maxVal) * 36, 4)}px` }} />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {recent.map((h, i) => (
                          <div key={i} className="flex-1 text-center">
                            <p className={clsx("text-[10px] font-medium",
                              i === recent.length - 1 ? "text-brand-600" : "text-gray-400"
                            )}>
                              {h.value > 0 ? h.value : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {history.length} {history.length === 1 ? "registro" : "registros"} · último: {formatDate(history[history.length - 1].date)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Composição corporal ──────────────────────────────────────────
function BodyCompositionSection({ assessments }) {
  const latest = assessments[assessments.length - 1];
  const first  = assessments[0];

  function delta(curr, prev, positiveIsGood) {
    if (curr == null || prev == null || curr === prev) return null;
    const diff = curr - prev;
    const good = positiveIsGood ? diff > 0 : diff < 0;
    return (
      <span className={clsx("text-xs font-medium", good ? "text-green-500" : "text-red-400")}>
        {diff > 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
      </span>
    );
  }

  const fatMass  = latest.weight && latest.fatPct != null
    ? +(latest.weight * latest.fatPct / 100).toFixed(1) : null;
  const bmi      = latest.weight && latest.height
    ? +(latest.weight / Math.pow(latest.height / 100, 2)).toFixed(1) : null;

  const metrics = [
    { label: "% Gordura",   value: latest.fatPct   != null ? `${latest.fatPct}%`    : null, raw: latest.fatPct,   prev: first.fatPct,   pos: false, accent: true },
    { label: "Peso",        value: latest.weight   != null ? `${latest.weight} kg`  : null, raw: latest.weight,   prev: first.weight,   pos: false },
    { label: "Massa magra", value: latest.leanMass != null ? `${latest.leanMass} kg`: null, raw: latest.leanMass, prev: first.leanMass, pos: true  },
    { label: "IMC",         value: bmi             != null ? `${bmi}`               : null, raw: bmi,             prev: first.weight && first.height ? +(first.weight / Math.pow(first.height / 100, 2)).toFixed(1) : null, pos: false },
  ].filter(m => m.value != null);

  if (metrics.length === 0) return null;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-900">Composição corporal</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>{formatDate(latest.date ?? latest.createdAt)}</span>
          {assessments.length > 1 && (
            <span className="px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-600 font-medium">
              {assessments.length} avaliações
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className={clsx("rounded-xl p-3 border",
            m.accent ? "bg-brand-50 border-brand-100" : "bg-gray-50 border-gray-100")}>
            <p className="text-xs text-gray-400 mb-1">{m.label}</p>
            <p className={clsx("text-lg font-bold", m.accent ? "text-brand-600" : "text-gray-900")}>
              {m.value}
            </p>
            {assessments.length > 1 && (
              <div className="mt-0.5 text-[11px] text-gray-400">
                {delta(m.raw, m.prev, m.pos) ?? <span className="text-gray-300">sem variação</span>}
                {m.prev != null && (
                  <span className="ml-1 text-gray-300">
                    (era {m.label === "% Gordura" ? `${m.prev}%` : `${m.prev}${m.label === "IMC" ? "" : " kg"}`})
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barra gordura vs magra */}
      {latest.fatPct != null && latest.leanMass != null && latest.weight != null && (
        <div className="mt-3">
          <div className="flex overflow-hidden h-2.5 rounded-full">
            <div className="bg-red-400 rounded-l-full" style={{ width: `${latest.fatPct}%` }} />
            <div className="bg-brand-400 rounded-r-full" style={{ width: `${(100 - latest.fatPct).toFixed(1)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Gorda {fatMass} kg
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              Magra {latest.leanMass} kg<span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StudentProgress() {
  const { profile }           = useAuth();
  const { plan }              = useStudentWorkout();
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [expandedLog, setExpandedLog]     = useState(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState(new Set());

  // Ao carregar os logs, recolhe automaticamente todas as semanas exceto a atual
  useEffect(() => {
    if (loading || logs.length === 0) return;
    const thisWeekMs = getWeekStart(new Date()).getTime();
    const toCollapse = new Set();
    logs.forEach(log => {
      const d  = log.date?.toDate ? log.date.toDate() : new Date(log.date ?? 0);
      const ws = getWeekStart(d).getTime();
      if (ws !== thisWeekMs) toCollapse.add(ws);
    });
    setCollapsedWeeks(toCollapse);
  }, [loading]);

  function toggleWeek(wsMs) {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      next.has(wsMs) ? next.delete(wsMs) : next.add(wsMs);
      return next;
    });
  }

  // Mapa exerciseId → { name, muscleGroup }
  const nameMap = {};
  plan?.days?.forEach(day => {
    day.exercises?.forEach(item => {
      if (item.type === "superset") {
        item.items?.forEach(sub => {
          nameMap[sub.id] = { name: sub.exercise?.name ?? "Exercício", muscleGroup: sub.exercise?.muscleGroup ?? "Outros" };
        });
      } else {
        nameMap[item.id] = { name: item.exercise?.name ?? "Exercício", muscleGroup: item.exercise?.muscleGroup ?? "Outros" };
      }
    });
  });

  useEffect(() => {
    if (!profile?.studentId) return;
    getDocs(query(collection(db, "assessments"), where("studentId", "==", profile.studentId)))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) =>
          (a.date?.seconds ?? a.createdAt?.seconds ?? 0) -
          (b.date?.seconds ?? b.createdAt?.seconds ?? 0)
        );
        setAssessments(data);
      })
      .catch(() => {});
  }, [profile?.studentId]);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
      setLogs(data);
      setLoading(false);
    });
    return () => { try { unsub(); } catch {} };
  }, [profile]);

  const thisMonth = logs.filter(l => {
    if (!l.date) return false;
    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const streak = (() => {
    if (logs.length === 0) return 0;
    let count = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = new Set(logs.map(l => {
      const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    for (let i = 0; i < 365; i++) {
      const day = new Date(today); day.setDate(today.getDate() - i);
      if (days.has(day.getTime())) count++;
      else if (i > 0) break;
    }
    return count;
  })();

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_4px_16px_rgba(0,0,0,0.15)] px-5 pt-12 pb-10">
        <h1 className="text-xl font-semibold text-white">Minha evolução</h1>
      </div>

      <div className="px-5 pb-5 flex flex-col gap-4" style={{ marginTop: "-1.5rem" }}>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-brand-500">{logs.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total de treinos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-teal-600">{thisMonth}</p>
            <p className="text-xs text-gray-400 mt-0.5">Este mês</p>
          </div>
          <div className={clsx("card p-4 text-center", streak >= 3 && "bg-gradient-to-b from-orange-50 to-white border-orange-200")}>
            <p className={clsx("text-2xl font-semibold", streak >= 3 ? "text-orange-500" : "text-yellow-500")}>
              {streak >= 3 ? "🔥" : ""}{streak}
            </p>
            <p className={clsx("text-xs mt-0.5", streak >= 3 ? "text-orange-400" : "text-gray-400")}>
              {streak >= 3 ? "em chamas!" : "dias seguidos"}
            </p>
          </div>
        </div>

        {/* Composição corporal */}
        {assessments.length > 0 && <BodyCompositionSection assessments={assessments} />}

        {/* Calendário mensal */}
        {!loading && <MonthCalendar logs={logs} />}

        {/* Frequência semanal */}
        {!loading && logs.length > 0 && <WeeklyFrequency logs={logs} />}

        {/* Evolução de carga */}
        {!loading && <LoadEvolution logs={logs} nameMap={nameMap} />}

        {/* Histórico */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Histórico</p>
          </div>

          {loading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-4 py-4 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-gray-400">Nenhum treino concluído ainda.<br/>Complete seu primeiro treino!</p>
            </div>
          ) : (() => {
            const grouped = [];
            const weekMap = new Map();
            logs.forEach(log => {
              const d  = log.date?.toDate ? log.date.toDate() : new Date(log.date ?? 0);
              const ws  = getWeekStart(d);
              const key = ws.getTime();
              if (!weekMap.has(key)) { weekMap.set(key, { ws, items: [] }); grouped.push(weekMap.get(key)); }
              weekMap.get(key).items.push(log);
            });

            const thisWeekMs = getWeekStart(new Date()).getTime();
            const lastWeekMs = thisWeekMs - 7 * 86400000;
            function weekLabel(ws) {
              if (ws.getTime() === thisWeekMs) return "Esta semana";
              if (ws.getTime() === lastWeekMs) return "Semana passada";
              const end = new Date(ws); end.setDate(ws.getDate() + 6);
              return `${format(ws, "dd/MM", { locale: ptBR })} – ${format(end, "dd/MM", { locale: ptBR })}`;
            }

            return (
              <div className="divide-y divide-gray-100">
                {grouped.map(({ ws, items }, gi) => {
                  const isCollapsed = collapsedWeeks.has(ws.getTime());
                  return (
                    <div key={ws.getTime()}>
                      <button onClick={() => toggleWeek(ws.getTime())}
                        className="w-full px-4 py-2.5 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                        <p className="text-xs font-semibold text-gray-600">{weekLabel(ws)}</p>
                        <span className="text-xs text-gray-400">· {items.length} {items.length === 1 ? "treino" : "treinos"}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"
                          className={clsx("ml-auto flex-shrink-0 transition-transform", isCollapsed && "-rotate-90")}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </button>

                      {!isCollapsed && (
                        <div className="divide-y divide-gray-100">
                          {items.map(log => {
                            const isOpen     = expandedLog === log.id;
                            const loadEntries = log.loads
                              ? Object.entries(log.loads).filter(([, v]) => v !== "" && v !== null && Number(v) > 0)
                              : [];
                            return (
                              <div key={log.id}>
                                <button onClick={() => setExpandedLog(isOpen ? null : log.id)}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors">
                                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3E564F" strokeWidth="2" strokeLinecap="round">
                                      <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{log.dayLabel ?? "Treino"}</p>
                                    <p className="text-xs text-gray-400">{log.exercisesDone ?? 0} exercícios · {formatDate(log.date)}</p>
                                  </div>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                                    className={clsx("flex-shrink-0 transition-transform", isOpen && "rotate-90")}>
                                    <path d="M9 18l6-6-6-6"/>
                                  </svg>
                                </button>

                                {isOpen && (
                                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                    {loadEntries.length > 0 ? (
                                      <div className="flex flex-col gap-1.5">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Cargas utilizadas</p>
                                        {loadEntries.map(([exId, value]) => (
                                          <div key={exId} className="flex items-center justify-between">
                                            <p className="text-xs text-gray-600 truncate">{nameMap[exId]?.name ?? "Exercício"}</p>
                                            <span className="text-xs font-semibold text-brand-600 ml-3 flex-shrink-0">{value} kg</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 text-center py-1">Nenhuma carga registrada neste treino.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
