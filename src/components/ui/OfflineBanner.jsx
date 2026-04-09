// src/components/ui/OfflineBanner.jsx
import { useEffect, useState } from "react";
import { useNetworkStatus }    from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const online            = useNetworkStatus();
  const [show, setShow]   = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [backOnline, setBackOnline] = useState(false);

  useEffect(() => {
    if (!online) {
      setShow(true);
      setBackOnline(false);
      setWasOffline(true);
    } else if (wasOffline) {
      // Volta online — mostra mensagem de reconexão por 3s
      setBackOnline(true);
      const timer = setTimeout(() => {
        setShow(false);
        setBackOnline(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [online, wasOffline]);

  if (!show) return null;

  return (
    <div
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg
        text-sm font-medium transition-all duration-300 animate-slide-up
        ${backOnline
          ? "bg-green-500 text-white"
          : "bg-gray-900 text-white"
        }
      `}
    >
      {backOnline ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Conexão restabelecida
        </>
      ) : (
        <>
          <span className="flex-shrink-0 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Sem conexão — modo offline
        </>
      )}
    </div>
  );
}