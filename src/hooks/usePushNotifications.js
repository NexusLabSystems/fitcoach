// src/hooks/usePushNotifications.js
// Notificações nativas do navegador (Notification API).
// Funciona mesmo com o app em segundo plano (se a aba estiver aberta).
// Não requer servidor — zero configuração extra.

import { useEffect, useState, useCallback } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  // ── Pedir permissão ────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // ── Disparar notificação ───────────────────────────────────
  const notify = useCallback((title, options = {}) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (document.visibilityState === "visible") return; // app está em foco — usa toast

    new Notification(title, {
      icon:  "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      ...options,
    });
  }, []);

  // ── Notificar lista de pagamentos atrasados ────────────────
  const notifyOverdue = useCallback((payments) => {
    if (!payments.length) return;

    if (payments.length === 1) {
      notify("💰 Pagamento atrasado — FitCoach", {
        body: `${payments[0].studentName} está com mensalidade em atraso.`,
        tag:  `overdue-${payments[0].paymentId}`,
      });
    } else {
      notify(`💰 ${payments.length} pagamentos atrasados — FitCoach`, {
        body: `Você tem ${payments.length} alunos com mensalidade em atraso.`,
        tag:  "overdue-batch",
      });
    }
  }, [notify]);

  return { permission, requestPermission, notify, notifyOverdue };
}