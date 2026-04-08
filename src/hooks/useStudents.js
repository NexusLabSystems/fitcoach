// src/hooks/useStudents.js
// ─────────────────────────────────────────────────────────────
// Hook centralizado para todas as operações de alunos.
// Usa onSnapshot para atualização em tempo real.
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function useStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // ── Escuta em tempo real ───────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "students"),
      where("trainerId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Ordena por nome no cliente (evita índice composto no Firestore)
        data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setStudents(data);
        setLoading(false);
      },
      (err) => {
        console.error("useStudents:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  // ── Criar aluno ────────────────────────────────────────────
  const createStudent = useCallback(async (data) => {
    if (!user) throw new Error("Não autenticado");
    const ref = await addDoc(collection(db, "students"), {
      ...data,
      trainerId: user.uid,
      status:    "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }, [user]);

  // ── Atualizar aluno ────────────────────────────────────────
  const updateStudent = useCallback(async (id, data) => {
    await updateDoc(doc(db, "students", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ── Arquivar aluno (soft delete) ───────────────────────────
  const archiveStudent = useCallback(async (id) => {
    await updateDoc(doc(db, "students", id), {
      status:    "inactive",
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ── Reativar aluno ─────────────────────────────────────────
  const reactivateStudent = useCallback(async (id) => {
    await updateDoc(doc(db, "students", id), {
      status:    "active",
      updatedAt: serverTimestamp(),
    });
  }, []);

  // ── Buscar aluno por ID ────────────────────────────────────
  const getStudent = useCallback(async (id) => {
    const snap = await getDoc(doc(db, "students", id));
    if (!snap.exists()) throw new Error("Aluno não encontrado");
    return { id: snap.id, ...snap.data() };
  }, []);

  // ── Estatísticas derivadas ─────────────────────────────────
  const stats = {
    total:    students.length,
    active:   students.filter(s => s.status === "active").length,
    inactive: students.filter(s => s.status === "inactive").length,
  };

  return {
    students,
    loading,
    error,
    stats,
    createStudent,
    updateStudent,
    archiveStudent,
    reactivateStudent,
    getStudent,
  };
}