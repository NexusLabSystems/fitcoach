// src/pages/student/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db }                   from "@/lib/firebase";
import { useAuth }              from "@/contexts/AuthContext";
import { useStudentWorkout }    from "@/hooks/useStudentWorkout";
import { format }               from "date-fns";
import { ptBR }                 from "date-fns/locale";

const MEDAL_THRESHOLDS = [1, 7, 10, 30, 50, 100];

function StatCard({ value, label, color = "text-gray-900" }) {
  return (
    <div className="flex-1 p-4 text-center card">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate          = useNavigate();
  const { profile }       = useAuth();
  const { plan, loading } = useStudentWorkout();

  const [logs, setLogs]         = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "workoutLogs"), where("studentId", "==", profile.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
      setLogs(data);
      setLogsLoading(false);
    });
    return unsub;
  }, [profile]);

  // Streak
  const streak = (() => {
    if (!logs.length) return 0;
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

  // Medalhas desbloqueadas
  const medalsUnlocked = MEDAL_THRESHOLDS.filter(t => logs.length >= t).length
    + (streak >= 7 ? 1 : 0) + (streak >= 30 ? 1 : 0);

  // Este mês
  const thisMonth = logs.filter(l => {
    if (!l.date) return false;
    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Frequência semanal — semana atual (seg → dom)
  const weekDays = (() => {
    const today = new Date();
    // 0=dom, 1=seg … adapta para semana começar na segunda
    const dayOfWeek = (today.getDay() + 6) % 7; // seg=0 … dom=6
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);

    const trainedSet = new Set(
      logs.map(l => {
        const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        label: ["S", "T", "Q", "Q", "S", "S", "D"][i],
        date: d,
        trained: trainedSet.has(d.getTime()),
        isToday: d.toDateString() === today.toDateString(),
      };
    });
  })();

  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName  = profile?.name?.split(" ")[0];
  const today      = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const initials   = profile?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  // Verificar se já treinou hoje
  const todayStr = new Date().toDateString();
  const trainedToday = logs.some(l => {
    const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
    return d.toDateString() === todayStr;
  });

  // Próximo dia: primeiro com exercícios (ignora se já treinou hoje)
  const nextDay = plan?.days?.find(d => d.exercises?.length > 0);
  const totalExercises = nextDay?.exercises?.length ?? 0;

  function formatDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, "dd/MM", { locale: ptBR });
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 capitalize mb-0.5">{today}</p>
            <h1 className="text-xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
          </div>
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={firstName}
              className="flex-shrink-0 object-cover border-2 border-gray-100 rounded-full w-11 h-11" />
          ) : (
            <div className="flex items-center justify-center flex-shrink-0 rounded-full w-11 h-11 bg-brand-100">
              <span className="text-sm font-bold text-brand-700">{initials}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5">

        {/* ── Treino do dia ─────────────────────────────────── */}
        {loading ? (
          <div className="p-5 card animate-pulse">
            <div className="w-1/3 h-4 mb-3 bg-gray-100 rounded" />
            <div className="w-2/3 h-6 mb-4 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded-xl" />
          </div>
        ) : plan ? (
          <div className="overflow-hidden card">
            {trainedToday ? (
              <div className="px-5 py-4 bg-green-500">
                <p className="mb-1 text-xs font-semibold tracking-widest text-green-200 uppercase">Treino de hoje</p>
                <p className="text-lg font-bold text-white truncate">{plan.name}</p>
                <p className="text-sm text-green-200 mt-0.5">Treino concluído hoje 🎉</p>
              </div>
            ) : (
              <div className="px-5 py-4 bg-brand-500">
                <p className="mb-1 text-xs font-semibold tracking-widest uppercase text-brand-200">Treino de hoje</p>
                <p className="text-lg font-bold text-white truncate">{plan.name}</p>
                {nextDay && (
                  <p className="text-sm text-brand-200 mt-0.5">
                    {nextDay.label} · {totalExercises} exercício{totalExercises !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
            <div className="p-4">
              {trainedToday ? (
                <div className="flex items-center justify-center gap-2 py-2 text-green-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span className="text-sm font-semibold">Parabéns! Descanse e volte amanhã.</span>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/student/workout")}
                  className="w-full py-3 text-base btn-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                  </svg>
                  Iniciar treino
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center card">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-2xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <p className="mb-1 text-sm font-semibold text-gray-700">Nenhum treino ativo</p>
            <p className="text-xs text-gray-400">Seu personal ainda não atribuiu um plano.</p>
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────── */}
        <div className="flex gap-3">
          <StatCard value={logs.length}   label="Treinos totais"  color="text-brand-500" />
          <StatCard value={thisMonth}     label="Este mês"        color="text-gray-900" />
          <StatCard value={`${streak}🔥`} label="Dias seguidos"   color="text-yellow-500" />
        </div>

        {/* ── Frequência semanal ────────────────────────────── */}
        <div className="p-4 card">
          <p className="mb-3 text-xs font-bold tracking-wide text-gray-500 uppercase">Frequência esta semana</p>
          <div className="flex items-center justify-between">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-semibold ${day.isToday ? "text-brand-500" : "text-gray-400"}`}>
                  {day.label}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${day.trained
                    ? "bg-brand-500"
                    : day.isToday
                      ? "border-2 border-brand-400 bg-brand-50"
                      : "bg-gray-100"
                  }`}>
                  {day.trained ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : day.isToday ? (
                    <div className="w-2 h-2 rounded-full bg-brand-400" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ações rápidas ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Evolução",
              to: "/student/progress",
              color: "bg-blue-50",
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            },
            {
              label: "Medalhas",
              to: "/student/medals",
              color: "bg-yellow-50",
              badge: medalsUnlocked,
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
            },
            {
              label: "Perfil",
              to: "/student/profile",
              color: "bg-teal-50",
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
            },
          ].map(a => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className={`${a.color} rounded-2xl p-4 flex flex-col items-center gap-2 relative`}
            >
              {a.badge > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-yellow-400 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {a.badge}
                </span>
              )}
              {a.icon}
              <span className="text-xs font-semibold text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>

        {/* ── Histórico recente ──────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-900">Histórico recente</p>
            <button onClick={() => navigate("/student/progress")}
              className="flex items-center gap-1 text-xs font-semibold text-brand-500">
              Ver tudo
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {logsLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 card animate-pulse">
                  <div className="flex-shrink-0 bg-gray-100 w-9 h-9 rounded-xl" />
                  <div className="flex-1">
                    <div className="w-1/2 h-3 mb-2 bg-gray-100 rounded" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center card">
              <p className="text-sm text-gray-400">Nenhum treino concluído ainda.<br/>Complete seu primeiro treino!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center gap-3 p-4 card">
                  <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-green-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{log.dayLabel ?? "Treino"}</p>
                    <p className="text-xs text-gray-400">{log.exercisesDone ?? 0} exercícios · {formatDate(log.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
