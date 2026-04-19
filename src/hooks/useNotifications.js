// src/hooks/useNotifications.js
import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, serverTimestamp,
  addDoc, getDocs,
} from "firebase/firestore";
import { db }      from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export function useNotifications() {
  const { user }                    = useAuth();
  const [notifications, setNotifs]  = useState([]);
  const [loading, setLoading]       = useState(true);

  // ── Escuta notificações em tempo real ──────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("trainerId", "==", user.uid),
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setNotifs(data);
      setLoading(false);
    });
    return () => { try { unsub(); } catch {} };
  }, [user]);

  // ── Verifica pagamentos vencidos e cria notificações ───────
  const checkOverduePayments = useCallback(async (students) => {
    if (!user) return;

    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

    // Busca pagamentos pending com data de vencimento passada
    const snap = await getDocs(
      query(
        collection(db, "payments"),
        where("trainerId", "==", user.uid),
        where("status",    "==", "pending"),
      )
    );

    const now = new Date();
    const overdue = snap.docs.filter(d => {
      const due = d.data().dueDate?.toDate
        ? d.data().dueDate.toDate()
        : new Date(d.data().dueDate);
      return due < now;
    });

    for (const payDoc of overdue) {
      const payment = { id: payDoc.id, ...payDoc.data() };

      // Marca como atrasado
      await updateDoc(doc(db, "payments", payment.id), {
        status:    "overdue",
        updatedAt: serverTimestamp(),
      });

      // Verifica se já existe notificação para este pagamento
      const existingSnap = await getDocs(
        query(
          collection(db, "notifications"),
          where("trainerId",  "==", user.uid),
          where("paymentId",  "==", payment.id),
          where("type",       "==", "overdue_payment"),
        )
      );
      if (!existingSnap.empty) continue;

      const studentName = studentMap[payment.studentId]?.name ?? "Aluno";

      // Cria notificação
      await addDoc(collection(db, "notifications"), {
        trainerId:   user.uid,
        paymentId:   payment.id,
        studentId:   payment.studentId,
        studentName,
        type:        "overdue_payment",
        title:       "Pagamento atrasado",
        message:     `${studentName} está com pagamento em atraso de R$ ${Number(payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
        read:        false,
        createdAt:   serverTimestamp(),
      });
    }

    return overdue.length;
  }, [user]);

  // ── Verifica planos próximos do vencimento / vencidos ─────
  const checkExpiringPlans = useCallback(async () => {
    if (!user) return;

    const snap = await getDocs(
      query(collection(db, "workoutPlans"),
        where("trainerId", "==", user.uid),
        where("status", "==", "active"),
      )
    );

    const now = new Date();
    const warningMs = 3 * 86400000; // 3 dias

    for (const planDoc of snap.docs) {
      const plan = { id: planDoc.id, ...planDoc.data() };
      if (!plan.validUntil) continue;

      const until = plan.validUntil.toDate ? plan.validUntil.toDate() : new Date(plan.validUntil);
      const diffMs = until - now;
      const expired = diffMs < 0;
      const expiringSoon = !expired && diffMs <= warningMs;

      if (!expired && !expiringSoon) continue;

      const type = expired ? "plan_expired" : "plan_expiring";

      // Evita duplicata (uma notif por tipo por plano)
      const existSnap = await getDocs(
        query(collection(db, "notifications"),
          where("trainerId", "==", user.uid),
          where("planId", "==", plan.id),
          where("type", "==", type),
        )
      );
      if (!existSnap.empty) continue;

      const daysLeft = expired ? 0 : Math.ceil(diffMs / 86400000);
      const studentSnap = plan.studentId
        ? await getDocs(query(collection(db, "students"), where("__name__", "==", plan.studentId)))
        : null;
      const studentName = studentSnap?.docs?.[0]?.data()?.name ?? "Aluno";

      await addDoc(collection(db, "notifications"), {
        trainerId:   user.uid,
        planId:      plan.id,
        planName:    plan.name,
        studentId:   plan.studentId ?? null,
        studentName,
        type,
        title:       expired ? "Plano de treino encerrado" : "Plano de treino expirando",
        message:     expired
          ? `O plano "${plan.name}" de ${studentName} foi encerrado.`
          : `O plano "${plan.name}" de ${studentName} ${daysLeft === 1 ? "encerra amanhã" : `encerra em ${daysLeft} dias`}.`,
        read:        false,
        createdAt:   serverTimestamp(),
      });
    }
  }, [user]);

  // ── Marcar como lida ───────────────────────────────────────
  const markRead = useCallback(async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  }, []);

  // ── Marcar todas como lidas ────────────────────────────────
  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
  }, [notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications, loading, unreadCount,
    checkOverduePayments, checkExpiringPlans, markRead, markAllRead,
  };
}