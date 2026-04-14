// src/hooks/useLastLog.js — busca o último log com cargas para um dia específico
import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Retorna o log mais recente do aluno para um dado plano + dia que contenha
 * o campo `loads` (map exerciseId → carga). Usado para mostrar "última vez".
 */
export function useLastLog(planId, dayLabel) {
  const { profile }       = useAuth();
  const [lastLog, setLastLog] = useState(null);

  useEffect(() => {
    if (!profile?.uid || !planId || !dayLabel) return;
    let cancelled = false;

    getDocs(query(
      collection(db, "workoutLogs"),
      where("studentId", "==", profile.uid),
      where("planId",    "==", planId)
    )).then(snap => {
      if (cancelled) return;
      const logs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(l => l.dayLabel === dayLabel && l.loads)
        .sort((a, b) => {
          const ta = a.date?.toMillis ? a.date.toMillis() : 0;
          const tb = b.date?.toMillis ? b.date.toMillis() : 0;
          return tb - ta;
        });
      setLastLog(logs[0] ?? null);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [profile?.uid, planId, dayLabel]);

  return lastLog;
}
