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

    // Duas queries separadas: próprios + globais (null no "in" é instável em prod)
    const qOwn    = query(collection(db, "exercises"), where("trainerId", "==", user.uid));
    const qGlobal = query(collection(db, "exercises"), where("trainerId", "==", null));

    let own    = [];
    let global = [];
    let loaded = 0;

    function merge() {
      const map  = new Map();
      [...global, ...own].forEach(ex => map.set(ex.id, ex));
      const data = Array.from(map.values());
      data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      setExercises(data);
      setLoading(false);
    }

    const unsubOwn = onSnapshot(qOwn, snap => {
      own = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded |= 1;
      merge();
    });

    const unsubGlobal = onSnapshot(qGlobal, snap => {
      global = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded |= 2;
      merge();
    });

    return () => { unsubOwn(); unsubGlobal(); };
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