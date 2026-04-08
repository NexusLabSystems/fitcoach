// src/pages/student/StudentProgress.jsx
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db }       from "@/lib/firebase";
import { useAuth }  from "@/contexts/AuthContext";
import { format }   from "date-fns";
import { ptBR }     from "date-fns/locale";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

export default function StudentProgress() {
  const { profile }   = useAuth();
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

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
    return unsub;
  }, [profile]);

  const thisMonth = logs.filter(l => {
    if (!l.date) return false;
    const d = l.date.toDate ? l.date.toDate() : new Date(l.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Streak simples: dias consecutivos com treino
  const streak = (() => {
    if (logs.length === 0) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = new Set(logs.map(l => {
      const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      if (days.has(day.getTime())) count++;
      else if (i > 0) break;
    }
    return count;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">Minha evolução</h1>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-brand-500">{logs.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total de treinos</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-gray-900">{thisMonth}</p>
            <p className="text-xs text-gray-400 mt-0.5">Este mês</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-500">{streak}</p>
            <p className="text-xs text-gray-400 mt-0.5">Dias seguidos</p>
          </div>
        </div>

        {/* History */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Histórico</p>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-gray-400">Nenhum treino concluído ainda.<br/>Complete seu primeiro treino!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map(log => (
                <div key={log.id} className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{log.dayLabel ?? "Treino"}</p>
                    <p className="text-xs text-gray-400">{log.exercisesDone ?? 0} exercícios · {formatDate(log.date)}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}