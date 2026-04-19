// src/components/ui/NotificationBell.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate }            from "react-router-dom";
import { useNotifications }       from "@/hooks/useNotifications";
import { usePushNotifications }   from "@/hooks/usePushNotifications";
import { useStudents }            from "@/hooks/useStudents";
import { format }                 from "date-fns";
import { ptBR }                   from "date-fns/locale";
import clsx                       from "clsx";
import toast                      from "react-hot-toast";

function timeAgo(ts) {
  if (!ts) return "";
  const d   = ts.toDate ? ts.toDate() : new Date(ts);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return format(d, "dd/MM", { locale: ptBR });
}

const TYPE_ICON = {
  overdue_payment: (
    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-red-100 rounded-full">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
        <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
      </svg>
    </div>
  ),
  plan_expiring: (
    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    </div>
  ),
  plan_expired: (
    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
  ),
};

export default function NotificationBell() {
  const navigate                          = useNavigate();
  const { notifications, unreadCount,
          markRead, markAllRead,
          checkOverduePayments,
          checkExpiringPlans }            = useNotifications();
  const { permission, requestPermission,
          notifyOverdue }                 = usePushNotifications();
  const { students }                      = useStudents();
  const [open, setOpen]                   = useState(false);
  const panelRef                          = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Verifica pagamentos vencidos + planos expirando ao montar (uma vez por sessão)
  useEffect(() => {
    if (!students.length) return;
    checkOverduePayments(students).then(count => {
      if (count > 0) {
        const overdue = notifications.filter(n => n.type === "overdue_payment" && !n.read);
        notifyOverdue(overdue);
      }
    });
    checkExpiringPlans();
  }, [students]);

  async function handleRequestPush() {
    const result = await requestPermission();
    if (result === "granted") toast.success("Notificações ativadas!");
    else toast.error("Permissão negada. Ative nas configurações do navegador.");
  }

  function handleClickNotif(notif) {
    markRead(notif.id);
    setOpen(false);
    if (notif.type === "overdue_payment") navigate("/trainer/payments");
    if (notif.type === "plan_expiring" || notif.type === "plan_expired") {
      if (notif.planId) navigate(`/trainer/workouts/${notif.planId}`);
      else navigate("/trainer/workouts");
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl z-[100] overflow-hidden animate-scale-in" style={{maxHeight:"calc(100vh - 80px)"}}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              Notificações
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-medium text-brand-500">{unreadCount} nova{unreadCount > 1 ? "s" : ""}</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {/* Push permission toggle */}
              {permission !== "granted" && (
                <button
                  onClick={handleRequestPush}
                  className="text-xs font-medium transition-colors text-brand-500 hover:text-brand-600"
                  title="Ativar notificações do navegador"
                >
                  Ativar push
                </button>
              )}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-gray-400 transition-colors hover:text-gray-600"
                >
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <div className="flex items-center justify-center w-10 h-10 mb-3 bg-gray-100 rounded-xl">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif)}
                  className={clsx(
                    "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0",
                    !notif.read && "bg-orange-50/60"
                  )}
                >
                  {TYPE_ICON[notif.type] ?? (
                    <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{notif.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-gray-300 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                  {!notif.read && (
                    <span className="flex-shrink-0 w-2 h-2 mt-1 rounded-full bg-brand-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => { navigate("/trainer/payments"); setOpen(false); }}
                className="text-xs font-medium transition-colors text-brand-500 hover:text-brand-600"
              >
                Ver todos os pagamentos →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}