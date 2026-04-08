// src/pages/student/StudentMedals.jsx
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import clsx        from "clsx";

const MEDAL_DEFS = [
  { id: "first",     label: "Primeiro treino",   desc: "Completou o primeiro treino",         emoji: "🏅", threshold: 1 },
  { id: "week",      label: "Uma semana",         desc: "7 treinos completados",               emoji: "🗓️", threshold: 7 },
  { id: "streak7",   label: "Sequência de fogo",  desc: "7 dias seguidos treinando",           emoji: "🔥", threshold: 7,  type: "streak" },
  { id: "ten",       label: "10 treinos",         desc: "10 treinos na conta",                 emoji: "💪", threshold: 10 },
  { id: "month",     label: "Um mês",             desc: "30 treinos completados",              emoji: "📅", threshold: 30 },
  { id: "fifty",     label: "50 treinos",         desc: "50 treinos na conta",                 emoji: "🏆", threshold: 50 },
  { id: "hundred",   label: "100 treinos",        desc: "100 treinos — elite!",                emoji: "👑", threshold: 100 },
  { id: "streak30",  label: "Mês sem parar",      desc: "30 dias consecutivos",                emoji: "⚡", threshold: 30, type: "streak" },
];

export default function StudentMedals() {
  const { profile }   = useAuth();
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "workoutLogs"), where("studentId", "==", profile.uid));
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [profile]);

  const totalLogs = logs.length;

  // Streak
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

  function isUnlocked(medal) {
    if (medal.type === "streak") return streak >= medal.threshold;
    return totalLogs >= medal.threshold;
  }

  const unlocked = MEDAL_DEFS.filter(isUnlocked).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">Medalhas</h1>
        <p className="text-sm text-gray-400 mt-0.5">{unlocked} de {MEDAL_DEFS.length} desbloqueadas</p>
      </div>

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-700"
            style={{ width: `${(unlocked / MEDAL_DEFS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-5 grid grid-cols-2 gap-3">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-2.5 bg-gray-100 rounded w-full" />
            </div>
          ))
        ) : (
          MEDAL_DEFS.map(medal => {
            const unlocked = isUnlocked(medal);
            return (
              <div
                key={medal.id}
                className={clsx(
                  "card p-4 transition-all",
                  unlocked ? "border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50" : "opacity-50 grayscale"
                )}
              >
                <span className="text-3xl block mb-2">{medal.emoji}</span>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{medal.label}</p>
                <p className="text-xs text-gray-400">{medal.desc}</p>
                {unlocked && (
                  <span className="inline-block mt-2 text-[10px] font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                    Desbloqueada
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}