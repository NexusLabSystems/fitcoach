// src/hooks/useExercises.js
import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps",
  "Pernas", "Glúteos", "Core", "Cardio", "Outro",
];

export const DIFFICULTIES = ["básico", "intermediário", "avançado"];

export const EQUIPMENT = [
  "Barra", "Halteres", "Cabo", "Máquina", "Peso corporal",
  "Elástico", "Kettlebell", "Smith", "Outro",
];

export function useExercises() {
  const { user }              = useAuth();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    // Busca exercícios do trainer + exercícios globais (trainerId == null)
    const q = query(
      collection(db, "exercises"),
      where("trainerId", "in", [user.uid, null])
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      setExercises(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const createExercise = useCallback(async (data) => {
    const ref = await addDoc(collection(db, "exercises"), {
      ...data,
      trainerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, [user]);

  const updateExercise = useCallback(async (id, data) => {
    await updateDoc(doc(db, "exercises", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteExercise = useCallback(async (id) => {
    await deleteDoc(doc(db, "exercises", id));
  }, []);

  // Exercícios agrupados por grupo muscular
  const byGroup = exercises.reduce((acc, ex) => {
    const g = ex.muscleGroup ?? "Outro";
    if (!acc[g]) acc[g] = [];
    acc[g].push(ex);
    return acc;
  }, {});

  return {
    exercises, loading, byGroup,
    createExercise, updateExercise, deleteExercise,
  };
}