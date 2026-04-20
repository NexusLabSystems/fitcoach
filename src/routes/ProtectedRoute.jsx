// src/routes/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────
// Redireciona usuários sem autenticação ou sem a role correta.
// Uso: <ProtectedRoute role="trainer" /> ou <ProtectedRoute role="student" />
// ─────────────────────────────────────────────────────────────
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Spinner centralizado usado durante o carregamento da sessão
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

// ── Rota que requer autenticação + role específica ─────────────
export function ProtectedRoute({ role }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  // Não autenticado → login
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Usuário autenticado mas sem doc em Firestore → redireciona para login
  if (!profile) return <Navigate to="/login" replace />;

  // Role errada → redireciona para a área correta
  if (role && profile.role !== role) {
    const destination = profile.role === "trainer" ? "/trainer" : "/student";
    return <Navigate to={destination} replace />;
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