// src/hooks/useInvite.js
import { useCallback } from "react";
import {
  collection, addDoc, getDocs, query,
  where, updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Gera token aleatório de 24 chars
function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function useInvite() {

  // ── Criar convite ──────────────────────────────────────────
  // Cria (ou reutiliza) um token para um aluno específico.
  const createInvite = useCallback(async ({ studentId, studentName, studentEmail, trainerId, trainerName }) => {
    // Verifica se já existe convite pendente para este aluno
    const existing = await getDocs(
      query(
        collection(db, "invites"),
        where("studentId", "==", studentId),
        where("status",    "==", "pending")
      )
    );

    if (!existing.empty) {
      return existing.docs[0].data().token;
    }

    const token = generateToken();
    await addDoc(collection(db, "invites"), {
      token,
      studentId,
      studentName,
      studentEmail: studentEmail ?? null,
      trainerId,
      trainerName,
      status:    "pending",   // pending | accepted | expired
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 dias
    });

    return token;
  }, []);

  // ── Buscar convite pelo token ──────────────────────────────
  const getInvite = useCallback(async (token) => {
    const snap = await getDocs(
      query(collection(db, "invites"), where("token", "==", token))
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = { id: d.id, ...d.data() };

    // Verifica expiração
    const expires = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expires < new Date()) {
      await updateDoc(doc(db, "invites", d.id), { status: "expired" });
      return { ...data, status: "expired" };
    }

    return data;
  }, []);

  // ── Aceitar convite ────────────────────────────────────────
  // Chamado após o aluno criar/entrar na conta.
  const acceptInvite = useCallback(async (inviteId, userId) => {
    await updateDoc(doc(db, "invites", inviteId), {
      status:     "accepted",
      acceptedBy: userId,
      acceptedAt: serverTimestamp(),
    });
  }, []);

  return { createInvite, getInvite, acceptInvite };
}