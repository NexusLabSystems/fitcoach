// src/pages/trainer/TrainerLayout.jsx
import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth }          from "@/contexts/AuthContext";
import NotificationBell     from "@/components/ui/NotificationBell";
import GlobalSearch         from "@/components/ui/GlobalSearch";
import toast                from "react-hot-toast";
import clsx                 from "clsx";

const NAV_ITEMS = [
  {
    to: "/trainer", end: true, label: "Dashboard",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    to: "/trainer/students", label: "Alunos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  },
  {
    to: "/trainer/workouts", label: "Treinos",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/></svg>,
  },
  {
    to: "/trainer/assessments", label: "Avaliações",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    to: "/trainer/exercises", label: "Exercícios",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  },
  {
    to: "/trainer/payments", label: "Financeiro",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
  },
  {
    to: "/trainer/settings", label: "Configurações",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  },
];

const PAGE_TITLES = {
  "/trainer":             "Dashboard",
  "/trainer/students":    "Alunos",
  "/trainer/workouts":    "Treinos",
  "/trainer/assessments": "Avaliações",
  "/trainer/exercises":   "Exercícios",
  "/trainer/payments":    "Financeiro",
  "/trainer/settings":    "Configurações",
};

function SideNavLink({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-brand-500 text-white shadow-brand"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export default function TrainerLayout() {
  const { profile, logout } = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  async function handleLogout() {
    await logout();
    toast.success("Até logo!");
    navigate("/login", { replace: true });
  }

  const initials = profile?.name
    ? profile.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "??";

  // Título da página atual
  const pageTitle = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => location.pathname.startsWith(path))?.[1] ?? "FitCoach";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Mobile overlay ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className={clsx(
        "fixed lg:relative z-30 flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-200",
        collapsed ? "w-16" : "w-56",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={clsx("flex items-center h-14 px-4 border-b border-gray-100 flex-shrink-0", collapsed ? "justify-center" : "gap-2")}>
          <div className="flex items-center justify-center flex-shrink-0 rounded-lg w-7 h-7 bg-brand-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
            </svg>
          </div>
          {!collapsed && <span className="text-sm font-semibold text-gray-900">FitCoach</span>}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 gap-1 p-3 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <SideNavLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Bottom: user + collapse */}
        <div className="flex flex-col gap-2 p-3 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="items-center hidden w-full gap-2 px-3 py-2 text-sm text-gray-500 transition-colors lg:flex rounded-xl hover:bg-gray-100"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"}/>
            </svg>
            {!collapsed && <span>Recolher</span>}
          </button>

          {/* User */}
          <div className={clsx("flex items-center gap-2 px-2 py-1", collapsed && "justify-center")}>
            <div className="flex items-center justify-center flex-shrink-0 rounded-full w-7 h-7 bg-brand-100">
              <span className="text-xs font-semibold text-brand-700">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{profile?.name}</p>
                <p className="text-[11px] text-gray-400 truncate">{profile?.email}</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm transition-colors w-full",
              collapsed && "justify-center"
            )}
            title="Sair"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top header (desktop + mobile) ──────────────── */}
        <header className="z-10 flex items-center flex-shrink-0 gap-3 px-4 bg-white border-b border-gray-200 h-14">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>

          {/* Page title */}
          <span className="hidden text-sm font-semibold text-gray-900 lg:block">{pageTitle}</span>

          {/* Logo — mobile only */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-brand-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">FitCoach</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}