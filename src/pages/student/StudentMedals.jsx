// src/pages/student/StudentMedals.jsx
import { useEffect, useState, useRef } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format }  from "date-fns";
import { ptBR }    from "date-fns/locale";
import toast       from "react-hot-toast";
import clsx        from "clsx";

const MEDAL_DEFS = [
  { id: "first",      emoji: "🏅", label: "Primeiro passo",          desc: "Completou o primeiro treino",                  threshold: 1 },
  { id: "week",       emoji: "🗓️", label: "Uma semana",               desc: "7 treinos completados",                        threshold: 7 },
  { id: "ten",        emoji: "💪", label: "10 treinos",               desc: "10 treinos concluídos",                        threshold: 10 },
  { id: "month",      emoji: "📅", label: "Um mês",                   desc: "30 treinos completados",                       threshold: 30 },
  { id: "fifty",      emoji: "🏆", label: "50 treinos",               desc: "50 treinos concluídos",                        threshold: 50 },
  { id: "hundred",    emoji: "👑", label: "100 treinos",              desc: "100 treinos — elite!",                         threshold: 100 },
  { id: "streak7",    emoji: "🔥", label: "Sequência de fogo",        desc: "7 dias seguidos treinando",                    threshold: 7,  type: "streak" },
  { id: "streak14",   emoji: "⚡", label: "Quinzena imparável",       desc: "14 dias consecutivos treinando",               threshold: 14, type: "streak" },
  { id: "streak30",   emoji: "🌟", label: "Mês sem parar",            desc: "30 dias consecutivos treinando",               threshold: 30, type: "streak" },
  { id: "earlybird",  emoji: "🌅", label: "Madrugador",               desc: "Treinou antes das 7h da manhã",                type: "special" },
  { id: "weekend",    emoji: "⚔️", label: "Fim de semana guerreiro",  desc: "Treinou no sábado ou domingo",                 type: "special" },
  { id: "consistent", emoji: "📆", label: "Consistência",             desc: "Treinou em 4 semanas diferentes no mesmo mês", type: "special" },
];

const CONFETTI_COLORS = ["#3E564F","#4CAF50","#3B82F6","#FFC107","#A855F7","#EC4899","#14B8A6"];

function MedalConfetti({ onDone }) {
  const particles = useRef(
    Array.from({ length: 36 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 1.6 + Math.random() * 1.4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 7,
      circle: Math.random() > 0.5,
    }))
  ).current;

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes medal-confetti {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {particles.map(p => (
          <div key={p.id} style={{
            position: "absolute", left: `${p.left}%`, top: "-12px",
            width: p.size, height: p.size, backgroundColor: p.color,
            borderRadius: p.circle ? "50%" : "2px",
            animation: `medal-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
          }} />
        ))}
      </div>
    </>
  );
}

export default function StudentMedals() {
  const { profile } = useAuth();
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [confetti, setConfetti] = useState(false);
  const prevUnlockedRef         = useRef(null);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "workoutLogs"), where("studentId", "==", profile.uid));
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  // ── Cálculos ──────────────────────────────────────────────────────
  const totalLogs = logs.length;

  const sortedLogs = [...logs].sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date ?? 0);
    const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date ?? 0);
    return da - db2;
  });

  const daySet = new Set(sortedLogs.map(l => {
    const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }));

  const streak = (() => {
    let count = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const day = new Date(today); day.setDate(today.getDate() - i);
      if (daySet.has(day.getTime())) count++;
      else if (i > 0) break;
    }
    return count;
  })();

  const bestStreak = (() => {
    if (daySet.size === 0) return 0;
    const sorted = [...daySet].sort((a, b) => a - b);
    let best = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === 86400000) { cur++; best = Math.max(best, cur); }
      else cur = 1;
    }
    return best;
  })();

  function isUnlocked(medal) {
    if (medal.type === "streak")  return streak >= medal.threshold;
    if (medal.type === "special") {
      if (medal.id === "earlybird")
        return sortedLogs.some(l => {
          const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
          return d.getHours() < 7;
        });
      if (medal.id === "weekend")
        return sortedLogs.some(l => {
          const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
          return d.getDay() === 0 || d.getDay() === 6;
        });
      if (medal.id === "consistent") {
        const byMonth = {};
        sortedLogs.forEach(l => {
          const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const week = Math.floor(d.getDate() / 7);
          if (!byMonth[key]) byMonth[key] = new Set();
          byMonth[key].add(week);
        });
        return Object.values(byMonth).some(weeks => weeks.size >= 4);
      }
      return false;
    }
    return totalLogs >= medal.threshold;
  }

  function getConquestDate(medal) {
    if (!isUnlocked(medal)) return null;
    let log = null;
    if (!medal.type) {
      log = sortedLogs[medal.threshold - 1];
    } else if (medal.type === "special") {
      if (medal.id === "earlybird")
        log = sortedLogs.find(l => { const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0); return d.getHours() < 7; });
      if (medal.id === "weekend")
        log = sortedLogs.find(l => { const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0); return d.getDay() === 0 || d.getDay() === 6; });
    }
    if (!log) return null;
    const d = log.date?.toDate ? log.date.toDate() : new Date(log.date);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  }

  function getProgress(medal) {
    if (medal.type === "special") return null;
    const current = medal.type === "streak" ? streak : totalLogs;
    return { current: Math.min(current, medal.threshold), total: medal.threshold };
  }

  // ── Detecta novas medalhas e dispara animação ─────────────────────
  const unlockedIds = MEDAL_DEFS.filter(isUnlocked).map(m => m.id).join(",");

  useEffect(() => {
    if (loading) return;
    if (prevUnlockedRef.current === null) { prevUnlockedRef.current = unlockedIds; return; }
    const prev = new Set(prevUnlockedRef.current.split(",").filter(Boolean));
    const curr = new Set(unlockedIds.split(",").filter(Boolean));
    const newOnes = [...curr].filter(id => !prev.has(id));
    if (newOnes.length > 0) {
      const medal = MEDAL_DEFS.find(m => m.id === newOnes[0]);
      setConfetti(true);
      toast.success(`${medal?.emoji} Nova medalha: ${medal?.label}!`, { duration: 4000 });
    }
    prevUnlockedRef.current = unlockedIds;
  }, [unlockedIds, loading]);

  const unlockedCount  = MEDAL_DEFS.filter(isUnlocked).length;
  const unlockedMedals = MEDAL_DEFS.filter(isUnlocked);
  const lockedMedals   = MEDAL_DEFS.filter(m => !isUnlocked(m));

  return (
    <div className="min-h-screen pb-10">
      {confetti && <MedalConfetti onDone={() => setConfetti(false)} />}

      {/* Cabeçalho */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">Medalhas</h1>
        <p className="text-sm text-gray-400 mt-0.5">{unlockedCount} de {MEDAL_DEFS.length} desbloqueadas</p>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-yellow-400 rounded-full transition-all duration-700"
            style={{ width: `${(unlockedCount / MEDAL_DEFS.length) * 100}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-5 pt-5">
        {[
          { label: "Treinos",           value: totalLogs,  color: "text-gray-900" },
          { label: "Sequência atual",   value: `🔥 ${streak}`,  color: "text-brand-500" },
          { label: "Melhor sequência",  value: `⭐ ${bestStreak}`, color: "text-yellow-500" },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className={clsx("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-5 grid grid-cols-2 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl mb-3" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-2.5 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Desbloqueadas */}
          {unlockedMedals.length > 0 && (
            <div className="px-5 pt-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Conquistadas</p>
              <div className="grid grid-cols-2 gap-3">
                {unlockedMedals.map(medal => {
                  const date = getConquestDate(medal);
                  return (
                    <div key={medal.id} className="card p-4 border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-4xl">{medal.emoji}</span>
                        <span className="text-[10px] font-bold text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full mt-1">✓</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 mb-0.5">{medal.label}</p>
                      <p className="text-xs text-gray-500 mb-2">{medal.desc}</p>
                      {date && (
                        <p className="text-[10px] text-yellow-700 font-medium">🗓 {date}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bloqueadas */}
          {lockedMedals.length > 0 && (
            <div className="px-5 pt-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Em progresso</p>
              <div className="grid grid-cols-2 gap-3">
                {lockedMedals.map(medal => {
                  const progress = getProgress(medal);
                  const pct = progress ? (progress.current / progress.total) * 100 : 0;
                  const remaining = progress ? progress.total - progress.current : null;
                  return (
                    <div key={medal.id} className="card p-4 opacity-70">
                      <span className="text-4xl grayscale block mb-2">{medal.emoji}</span>
                      <p className="text-sm font-bold text-gray-700 mb-0.5">{medal.label}</p>
                      <p className="text-xs text-gray-400 mb-3">{medal.desc}</p>
                      {progress && (
                        <>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
                            <div className="h-full bg-brand-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {progress.current}/{progress.total}
                            {remaining !== null && remaining > 0 && (
                              <span className="text-brand-500 font-semibold"> · faltam {remaining}</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
