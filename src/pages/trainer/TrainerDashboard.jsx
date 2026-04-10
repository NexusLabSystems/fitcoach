// src/pages/trainer/TrainerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 flex flex-col gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent.bg}`}>
          <span className={accent.icon}>{icon}</span>
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold tracking-tight ${accent.text}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Student row ────────────────────────────────────────────────
function StudentRow({ student, onClick }) {
  const initials = student.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-gray-50 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-brand-700">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
        <p className="text-xs text-gray-400 truncate">{student.goal || student.email}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`badge ${student.status === "active" ? "badge-green" : "badge-gray"}`}>
          {student.status === "active" ? "Ativo" : "Inativo"}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </button>
  );
}

// ── Quick action button ────────────────────────────────────────
function QuickAction({ label, description, icon, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left w-full"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{description}</p>
      </div>
    </button>
  );
}

// ── Skeleton ───────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

export default function TrainerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]       = useState({ students: 0, active: 0, plans: 0, pending: 0, overdue: 0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const tid = user.uid;

      const [studentsSnap, plansSnap, pendingSnap, overdueSnap] = await Promise.all([
        getDocs(query(collection(db, "students"), where("trainerId", "==", tid))),
        getDocs(query(collection(db, "workoutPlans"), where("trainerId", "==", tid))),
        getDocs(query(collection(db, "payments"), where("trainerId", "==", tid), where("status", "==", "pending"))),
        getDocs(query(collection(db, "payments"), where("trainerId", "==", tid), where("status", "==", "overdue"))),
      ]);

      const allStudents = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeCount = allStudents.filter(s => s.status === "active").length;

      setStats({
        students: allStudents.length,
        active:   activeCount,
        plans:    plansSnap.size,
        pending:  pendingSnap.size,
        overdue:  overdueSnap.size,
      });

      setStudents(
        [...allStudents]
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
          .slice(0, 5)
      );
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const firstName = profile?.name?.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={firstName}
              className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-brand-700">
                {profile?.name?.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{today}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {loading ? "Carregando..." : `${stats.active} aluno${stats.active !== 1 ? "s" : ""} ativo${stats.active !== 1 ? "s" : ""} · ${stats.plans} plano${stats.plans !== 1 ? "s" : ""} de treino`}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/trainer/students")}
          className="btn-primary self-start sm:self-auto"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Novo aluno
        </button>
      </div>

      {/* ── Overdue alert ──────────────────────────────────────── */}
      {!loading && stats.overdue > 0 && (
        <button
          onClick={() => navigate("/trainer/payments")}
          className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-left hover:bg-red-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">
              {stats.overdue} cobrança{stats.overdue !== 1 ? "s" : ""} em atraso
            </p>
            <p className="text-xs text-red-400">Clique para ver e resolver</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-4">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total de alunos"
            value={stats.students}
            sub={`${stats.active} ativos`}
            accent={{ bg: "bg-brand-50", icon: "text-brand-500", text: "text-gray-900" }}
            onClick={() => navigate("/trainer/students")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            }
          />
          <KpiCard
            label="Alunos ativos"
            value={stats.active}
            sub="treinando agora"
            accent={{ bg: "bg-green-50", icon: "text-green-600", text: "text-green-600" }}
            onClick={() => navigate("/trainer/students")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            }
          />
          <KpiCard
            label="Planos de treino"
            value={stats.plans}
            sub="criados"
            accent={{ bg: "bg-blue-50", icon: "text-blue-600", text: "text-gray-900" }}
            onClick={() => navigate("/trainer/workouts")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            }
          />
          <KpiCard
            label="Pagamentos"
            value={stats.pending}
            sub={stats.pending === 0 ? "tudo em dia" : "aguardando confirmação"}
            accent={{
              bg:   stats.pending > 0 ? "bg-yellow-50" : "bg-gray-50",
              icon: stats.pending > 0 ? "text-yellow-600" : "text-gray-400",
              text: stats.pending > 0 ? "text-yellow-600" : "text-gray-900",
            }}
            onClick={() => navigate("/trainer/payments")}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
              </svg>
            }
          />
        </div>
      )}

      {/* ── Bottom grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent students — 3 cols */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Alunos recentes</h2>
              <p className="text-xs text-gray-400">Últimos cadastros</p>
            </div>
            <button
              onClick={() => navigate("/trainer/students")}
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-1"
            >
              Ver todos
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">Nenhum aluno ainda</p>
              <p className="text-xs text-gray-400 mb-4">Comece cadastrando seu primeiro aluno</p>
              <button onClick={() => navigate("/trainer/students")} className="btn-primary text-xs px-4 py-2">
                Cadastrar aluno
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map(s => (
                <StudentRow
                  key={s.id}
                  student={s}
                  onClick={() => navigate(`/trainer/students/${s.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions — 2 cols */}
        <div className="lg:col-span-2 card p-6">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900">Ações rápidas</h2>
            <p className="text-xs text-gray-400">Atalhos do sistema</p>
          </div>
          <div className="flex flex-col gap-2">
            <QuickAction
              label="Novo aluno"
              description="Cadastrar e vincular"
              accent="bg-brand-50"
              onClick={() => navigate("/trainer/students")}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  <path d="M16 11h6m-3-3v6"/>
                </svg>
              }
            />
            <QuickAction
              label="Montar treino"
              description="Criar plano de exercícios"
              accent="bg-blue-50"
              onClick={() => navigate("/trainer/workouts/new")}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                </svg>
              }
            />
            <QuickAction
              label="Avaliação física"
              description="Registrar fotos e métricas"
              accent="bg-teal-50"
              onClick={() => navigate("/trainer/assessments")}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
              }
            />
            <QuickAction
              label="Nova cobrança"
              description="Lançar mensalidade"
              accent="bg-yellow-50"
              onClick={() => navigate("/trainer/payments")}
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
