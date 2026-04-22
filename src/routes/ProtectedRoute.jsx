// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}

function BlockedScreen({ onLogout }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Conta desativada</h1>
        <p className="text-sm text-gray-500 mb-6">
          Seu acesso foi desativado pelo seu personal trainer. Entre em contato para reativar.
        </p>
        <button onClick={onLogout} className="btn-primary w-full py-3">
          Sair
        </button>
      </div>
    </div>
  );
}

// ── Rota que requer autenticação + role específica ─────────────
export function ProtectedRoute({ role }) {
  const { user, profile, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (!profile) return <Navigate to="/login" replace />;

  // Role errada → redireciona para a área correta
  if (role && profile.role !== role) {
    const destination = profile.role === "trainer" ? "/trainer" : "/student";
    return <Navigate to={destination} replace />;
  }

  // Aluno arquivado → tela de bloqueio
  if (profile.role === "student" && profile.studentStatus === "inactive") {
    return <BlockedScreen onLogout={logout} />;
  }

  return <Outlet />;
}

// ── Rota pública (login/register) — redireciona se já logado ──
export function PublicRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (user && profile) {
    const destination = profile.role === "trainer" ? "/trainer" : "/student";
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}