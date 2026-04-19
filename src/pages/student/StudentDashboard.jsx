// src/pages/student/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db }                from "@/lib/firebase";
import { useAuth }           from "@/contexts/AuthContext";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import { format }            from "date-fns";
import { ptBR }              from "date-fns/locale";
import clsx                  from "clsx";

const NEXT_ACHIEVEMENTS = [
  { label: "Primeiro treino",   threshold: 1,   emoji: "🏅", type: "count" },
  { label: "7 treinos",         threshold: 7,   emoji: "🗓️", type: "count" },
  { label: "10 treinos",        threshold: 10,  emoji: "💪", type: "count" },
  { label: "30 treinos",        threshold: 30,  emoji: "📅", type: "count" },
  { label: "50 treinos",        threshold: 50,  emoji: "🏆", type: "count" },
  { label: "100 treinos",       threshold: 100, emoji: "👑", type: "count" },
  { label: "7 dias seguidos",   threshold: 7,   emoji: "🔥", type: "streak" },
  { label: "14 dias seguidos",  threshold: 14,  emoji: "⚡", type: "streak" },
  { label: "30 dias seguidos",  threshold: 30,  emoji: "🌟", type: "streak" },
];

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}min` : ""}`;
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM", { locale: ptBR });
}

export default function StudentDashboard() {
  const navigate          = useNavigate();
  const { profile }       = useAuth();
  const { plan, loading, isExpired, daysUntilExpiry } = useStudentWorkout();

  const [logs, setLogs]             = useState([]);
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
    return () => { try { unsub(); } catch {} };
  }, [profile]);

  // ── Cálculos ──────────────────────────────────────────────────────
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

  const thisMonth = logs.filter(l => {
    if (!l.date) return false;
    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const weekDays = (() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek);
    monday.setHours(0, 0, 0, 0);
    const trainedSet = new Set(logs.map(l => {
      const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        label: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][i],
        short: ["S","T","Q","Q","S","S","D"][i],
        dayNum: d.getDate(),
        date: d,
        trained: trainedSet.has(d.getTime()),
        isToday: d.toDateString() === today.toDateString(),
        isPast: d < today && d.toDateString() !== today.toDateString(),
      };
    });
  })();

  const weekTrained = weekDays.filter(d => d.trained).length;

  const todayStr     = new Date().toDateString();
  const trainedToday = logs.some(l => {
    const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
    return d.toDateString() === todayStr;
  });

  const nextDay = (() => {
    const validDays = plan?.days?.filter(d => d.exercises?.length > 0) ?? [];
    if (!validDays.length) return null;
    const planLogs = logs.filter(l => l.planId === plan?.id)
      .sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0));
    if (!planLogs.length) return validDays[0];
    const lastIndex = validDays.findIndex(d => d.label === planLogs[0].dayLabel);
    return validDays[(lastIndex === -1 ? 0 : lastIndex + 1) % validDays.length];
  })();

  const nextMuscles = [...new Set(
    (nextDay?.exercises ?? []).flatMap(ex =>
      ex.type === "superset"
        ? ex.items.map(s => s.exercise?.muscleGroup).filter(Boolean)
        : [ex.exercise?.muscleGroup].filter(Boolean)
    )
  )].slice(0, 3);

  const totalExercises = nextDay?.exercises?.length ?? 0;

  const nextAchievement = (() => {
    const options = NEXT_ACHIEVEMENTS
      .map(m => ({ ...m, current: m.type === "streak" ? streak : logs.length }))
      .filter(m => m.current < m.threshold)
      .sort((a, b) => (a.threshold - a.current) - (b.threshold - b.current));
    return options[0] ?? null;
  })();

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = profile?.name?.split(" ")[0];
  const today     = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const initials  = profile?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const motivation = streak >= 14 ? `${streak} dias seguidos — você é imparável`
    : streak >= 7  ? `${streak} dias seguidos — sequência incrível`
    : streak >= 3  ? `${streak} dias seguidos — continue assim`
    : streak === 1 ? "Treinou ontem, mantenha o ritmo"
    : trainedToday ? "Treino feito hoje, descanse bem"
    : "Bora treinar hoje? Cada dia conta";

  const quickActions = [
    {
      label: "Evolução",
      sub: "Seu progresso",
      to: "/student/progress",
      bg: "bg-blue-50",
      iconColor: "#3b82f6",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
    {
      label: "Medalhas",
      sub: "Conquistas",
      to: "/student/medals",
      bg: "bg-yellow-50",
      iconColor: "#d97706",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
    },
    {
      label: "Treinos",
      sub: "Ver plano",
      to: "/student/workout",
      bg: "bg-brand-50",
      iconColor: "#3E564F",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/></svg>,
    },
    {
      label: "Perfil",
      sub: "Suas info",
      to: "/student/profile",
      bg: "bg-teal-50",
      iconColor: "#0d9488",
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    },
  ];

  return (
    <div className="min-h-screen">

      {/* ── Header com gradiente ──────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-brand-200 capitalize mb-0.5">{today}</p>
            <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}</h1>
          </div>
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={firstName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white/40 flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ring-2 ring-white/40">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
          )}
        </div>
        <div className="bg-white/15 rounded-xl px-3 py-2 inline-block">
          <p className="text-sm text-white font-medium">{motivation}</p>
        </div>
      </div>

      {/* Banner de plano expirado / expirando */}
      {isExpired && (
        <div className="mx-5 mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700">Plano encerrado</p>
            <p className="text-xs text-red-500 mt-0.5">Seu plano de treino expirou. Entre em contato com seu personal para renovar e liberar o acesso completo.</p>
          </div>
        </div>
      )}
      {!isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
        <div className="mx-5 mt-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Plano expirando em breve</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Seu plano {daysUntilExpiry === 1 ? "encerra amanhã" : `encerra em ${daysUntilExpiry} dias`}. Fale com seu personal para renovar.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 p-5 -mt-2">

        {/* ── Treino do dia ─────────────────────────────────── */}
        {loading ? (
          <div className="card p-5 animate-pulse">
            <div className="w-1/3 h-4 mb-3 bg-gray-100 rounded" />
            <div className="w-2/3 h-6 mb-4 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        ) : plan ? (
          <div className="card overflow-hidden">
            <div className={clsx("px-5 py-5 relative overflow-hidden", trainedToday ? "bg-green-500" : "bg-brand-900")}>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10" width="80" height="80"
                viewBox="0 0 24 24" fill="white">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
              <p className={clsx("text-xs font-bold tracking-widest uppercase mb-1",
                trainedToday ? "text-green-200" : "text-gray-400")}>
                {trainedToday ? "Concluído hoje" : "Próximo treino"}
              </p>
              <p className="text-xl font-bold text-white truncate mb-1">{plan.name}</p>
              {!trainedToday && nextDay && (
                <div className="flex items-center flex-wrap gap-2 mt-2">
                  <span className="text-xs font-semibold text-white/80 bg-white/10 px-2 py-0.5 rounded-full">
                    {nextDay.label}
                  </span>
                  <span className="text-xs text-gray-400">{totalExercises} exercícios</span>
                  {nextMuscles.map(m => (
                    <span key={m} className="text-xs text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">{m}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4">
              {trainedToday ? (
                <div className="flex items-center justify-center gap-2 py-1 text-green-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-sm font-semibold">Parabéns! Descanse e volte amanhã.</span>
                </div>
              ) : (
                <button onClick={() => navigate("/student/workout")} className="w-full py-3.5 text-base btn-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                  </svg>
                  Iniciar treino
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Nenhum treino ativo</p>
            <p className="text-xs text-gray-400">Seu personal ainda não atribuiu um plano.</p>
          </div>
        )}

        {/* ── Stats com ícones ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              value: logs.length, label: "Total", sublabel: "treinos",
              bg: "bg-brand-50", color: "text-brand-600",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3E564F" strokeWidth="2.5" strokeLinecap="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>,
            },
            {
              value: thisMonth, label: "Este", sublabel: "mês",
              bg: "bg-blue-50", color: "text-blue-600",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            },
            {
              value: streak, label: "Dias", sublabel: "seguidos",
              bg: "bg-yellow-50", color: "text-yellow-600",
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
            },
          ].map(s => (
            <div key={s.label} className="card p-3.5 text-center">
              <div className={clsx("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2", s.bg)}>
                {s.icon}
              </div>
              <p className={clsx("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{s.label}<br/>{s.sublabel}</p>
            </div>
          ))}
        </div>

        {/* ── Frequência semanal ────────────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Frequência semanal</p>
            <span className="text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-1 rounded-lg">
              {weekTrained} de 7 dias
            </span>
          </div>
          <div className="flex items-center justify-between">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={clsx("text-[10px] font-semibold",
                  day.isToday ? "text-brand-500" : "text-gray-400")}>
                  {day.short}
                </span>
                <div className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all text-xs font-bold",
                  day.trained   ? "bg-brand-500 text-white shadow-sm"
                  : day.isToday ? "border-2 border-brand-400 bg-brand-50 text-brand-500"
                  : day.isPast  ? "bg-gray-100 text-gray-300"
                  : "bg-gray-100 text-gray-400"
                )}>
                  {day.trained ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  ) : (
                    <span>{day.dayNum}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Próxima conquista ─────────────────────────────── */}
        {nextAchievement && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">Próxima conquista</p>
              <span className="text-lg">{nextAchievement.emoji}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{nextAchievement.label}</p>
              <p className="text-xs font-semibold text-gray-700">
                {nextAchievement.current}/{nextAchievement.threshold}
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-brand-500 rounded-full transition-all duration-700"
                style={{ width: `${(nextAchievement.current / nextAchievement.threshold) * 100}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              Faltam {nextAchievement.threshold - nextAchievement.current} {nextAchievement.type === "streak" ? "dias seguidos" : "treinos"}
            </p>
          </div>
        )}

        {/* ── Ações rápidas 2×2 ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(a => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={clsx("card p-4 text-left flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]")}>
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", a.bg)}
                style={{ color: a.iconColor }}>
                {a.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{a.label}</p>
                <p className="text-xs text-gray-400">{a.sub}</p>
              </div>
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {logsLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card flex items-center gap-3 p-4 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm text-gray-400">Nenhum treino concluído ainda.<br/>Complete seu primeiro treino!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.slice(0, 4).map(log => {
                const duration = formatDuration(log.durationSeconds);
                return (
                  <div key={log.id} className="card flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{log.dayLabel ?? "Treino"}</p>
                      <p className="text-xs text-gray-400">
                        {log.exercisesDone ?? 0} exercícios
                        {duration && <span> · {duration}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
