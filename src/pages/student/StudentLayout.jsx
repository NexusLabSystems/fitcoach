// src/pages/student/StudentLayout.jsx
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentWorkout } from "@/hooks/useStudentWorkout";
import toast from "react-hot-toast";
import clsx from "clsx";

const NAV = [
  {
    to: "/student",
    end: true,
    label: "Início",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#3E564F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    to: "/student/workout",
    label: "Treino",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#3E564F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
        <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
      </svg>
    ),
  },
  {
    to: "/student/progress",
    label: "Evolução",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#3E564F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    to: "/student/medals",
    label: "Medalhas",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#3E564F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
  {
    to: "/student/profile",
    label: "Perfil",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#3E564F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function StudentLayout() {
  const { logout }                       = useAuth();
  const navigate                         = useNavigate();
  const location                         = useLocation();
  const { isExpired, loading }           = useStudentWorkout();

  // Redireciona para o dashboard se o plano expirou e o aluno tenta acessar outra tela
  useEffect(() => {
    if (!loading && isExpired && location.pathname !== "/student") {
      navigate("/student", { replace: true });
    }
  }, [isExpired, loading, location.pathname]);

  function handleLockedNavClick() {
    toast("Plano encerrado. Entre em contato com seu personal para renovar.", { icon: "🔒" });
  }

  async function handleLogout() {
    await logout();
    toast.success("Até logo!");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto">
      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 z-20">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV.map(item => {
            const isHome = item.end === true;
            const locked = isExpired && !isHome;

            if (locked) {
              return (
                <button
                  key={item.to}
                  onClick={handleLockedNavClick}
                  className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl min-w-0 text-gray-300 relative"
                >
                  {item.icon(false)}
                  <span className="text-[10px] font-medium">{item.label}</span>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"
                    className="absolute top-0 right-2 text-gray-300">
                    <path d="M18 11H6V8a6 6 0 0112 0v3zm-6 9a2 2 0 01-2-2v-4h4v4a2 2 0 01-2 2z"/>
                    <rect x="4" y="11" width="16" height="11" rx="2"/>
                  </svg>
                </button>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-colors min-w-0",
                    isActive ? "text-brand-500" : "text-gray-400"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive)}
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}