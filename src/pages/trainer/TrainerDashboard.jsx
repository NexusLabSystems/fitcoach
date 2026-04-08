// src/pages/trainer/TrainerDashboard.jsx
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "text-gray-900", icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-3xl font-semibold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ── Recent student row ────────────────────────────────────────
function StudentRow({ student }) {
  const initials = student.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-semibold text-brand-700">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
        <p className="text-xs text-gray-400">{student.email}</p>
      </div>
      <span className={`badge ${student.status === "active" ? "badge-green" : "badge-gray"}`}>
        {student.status === "active" ? "Ativo" : "Inativo"}
      </span>
    </div>
  );
}

export default function TrainerDashboard() {
  const { user, profile } = useAuth();

  const [stats, setStats]     = useState({ students: 0, active: 0, plans: 0, pending: 0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const trainerId = user.uid;

      // Contar alunos
      const studentsSnap = await getDocs(
        query(collection(db, "students"), where("trainerId", "==", trainerId))
      );
      const allStudents  = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const activeCount  = allStudents.filter(s => s.status === "active").length;

      // Planos de treino
      const plansSnap = await getDocs(
        query(collection(db, "workoutPlans"), where("trainerId", "==", trainerId))
      );

      // Pagamentos pendentes
      const paymentsSnap = await getDocs(
        query(collection(db, "payments"), where("trainerId", "==", trainerId), where("status", "==", "pending"))
      );

      setStats({
        students: allStudents.length,
        active:   activeCount,
        plans:    plansSnap.size,
        pending:  paymentsSnap.size,
      });

      // Últimos 5 alunos
      setStudents(allStudents.slice(0, 5));
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-sm text-gray-400 capitalize">{today}</p>
        <h1 className="text-2xl font-semibold text-gray-900 mt-0.5">
          Olá, {profile?.name?.split(" ")[0]} 👋
        </h1>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total de alunos"
            value={stats.students}
            sub="cadastrados"
            color="text-gray-900"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            }
          />
          <StatCard
            label="Alunos ativos"
            value={stats.active}
            sub="este mês"
            color="text-brand-500"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="1.8" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            }
          />
          <StatCard
            label="Planos de treino"
            value={stats.plans}
            sub="criados"
            color="text-gray-900"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            }
          />
          <StatCard
            label="Cobranças pendentes"
            value={stats.pending}
            sub="aguardando pagamento"
            color={stats.pending > 0 ? "text-red-500" : "text-gray-900"}
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stats.pending > 0 ? "#ef4444" : "currentColor"} strokeWidth="1.8" strokeLinecap="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
              </svg>
            }
          />
        </div>
      )}

      {/* Recent students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Alunos recentes</h2>
            <button className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">
              Ver todos →
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-3">Nenhum aluno cadastrado ainda.</p>
              <button className="btn-primary text-xs px-4 py-2">
                Cadastrar primeiro aluno
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {students.map(s => <StudentRow key={s.id} student={s} />)}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Ações rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Novo aluno",    color: "bg-brand-50 text-brand-600 hover:bg-brand-100", icon: "👤" },
              { label: "Novo treino",   color: "bg-blue-50 text-blue-600 hover:bg-blue-100",   icon: "🏋️" },
              { label: "Avaliação",     color: "bg-teal-50 text-teal-600 hover:bg-teal-100",   icon: "📊" },
              { label: "Cobrança",      color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100", icon: "💰" },
            ].map(action => (
              <button
                key={action.label}
                className={`${action.color} rounded-xl p-4 text-left transition-colors`}
              >
                <span className="text-2xl block mb-2">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}