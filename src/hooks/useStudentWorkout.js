// src/hooks/useStudentWorkout.js
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function useStudentWorkout() {
  const { profile }       = useAuth();
  const [plan, setPlan]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // studentId é o ID do doc na coleção `students` (linkado pelo trainer)
    // Fallback para uid caso o perfil seja direto
    const linkedId = profile.studentId ?? profile.uid;

    const q = query(
      collection(db, "workoutPlans"),
      where("studentId", "==", linkedId),
      where("status",    "==", "active")
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setPlan({ id: d.id, ...d.data() });
      } else {
        setPlan(null);
      }
      setLoading(false);
    });

    return () => { try { unsub(); } catch {} };
  }, [profile?.studentId, profile?.uid]);

  let isExpired = false;
  let daysUntilExpiry = null;
  if (plan?.validUntil) {
    const until = plan.validUntil.toDate ? plan.validUntil.toDate() : new Date(plan.validUntil);
    const diffMs = until - new Date();
    isExpired = diffMs < 0;
    daysUntilExpiry = isExpired ? 0 : Math.ceil(diffMs / 86400000);
  }

  return { plan, loading, isExpired, daysUntilExpiry };
}