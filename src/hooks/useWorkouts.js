// src/hooks/useWorkouts.js
import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function useWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "workoutPlans"),
      where("trainerId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPlans(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // ── Criar plano ────────────────────────────────────────────
  const createPlan = useCallback(async (data) => {
    const ref = await addDoc(collection(db, "workoutPlans"), {
      ...data,
      trainerId: user.uid,
      days:      [],
      status:    "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, [user]);

  // ── Atualizar plano ────────────────────────────────────────
  const updatePlan = useCallback(async (id, data) => {
    await updateDoc(doc(db, "workoutPlans", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ── Deletar plano ──────────────────────────────────────────
  const deletePlan = useCallback(async (id) => {
    await deleteDoc(doc(db, "workoutPlans", id));
  }, []);

  // ── Buscar plano por ID ────────────────────────────────────
  const getPlan = useCallback(async (id) => {
    const snap = await getDoc(doc(db, "workoutPlans", id));
    if (!snap.exists()) throw new Error("Plano não encontrado");
    return { id: snap.id, ...snap.data() };
  }, []);

  return { plans, loading, createPlan, updatePlan, deletePlan, getPlan };
}