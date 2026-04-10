// src/pages/trainer/WorkoutsPage.jsx
import { useState, useMemo } from "react";
import { useNavigate }       from "react-router-dom";
import { useWorkouts }       from "@/hooks/useWorkouts";
import { useStudents }       from "@/hooks/useStudents";
import EmptyState            from "@/components/ui/EmptyState";
import Modal                 from "@/components/ui/Modal";
import toast                 from "react-hot-toast";
import { format }            from "date-fns";
import { ptBR }              from "date-fns/locale";

const STATUS_STYLE = {
  active:   "badge-green",
  inactive: "badge-gray",
  draft:    "badge-gold",
};

const STATUS_LABEL = {
  active:   "Ativo",
  inactive: "Inativo",
  draft:    "Rascunho",
};

function DuplicateModal({ open, onClose, plan, students, onConfirm }) {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirm(plan, studentId || null);
      toast.success("Plano duplicado!");
      onClose();
      setStudentId("");
    } catch { toast.error("Erro ao duplicar."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Duplicar plano">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">Duplicando: <span className="font-medium text-gray-900">{plan?.name}</span></p>
          <div>
            <label className="label">Atribuir ao aluno (opcional)</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input" disabled={loading}>
              <option value="">Sem aluno vinculado</option>
              {students.filter(s => s.status === "active").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Duplicando...</> : "Duplicar"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

function PlanCard({ plan, studentName, onDelete, onDuplicate }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function formatDate(ts) {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }

  const dayCount = plan.days?.length ?? 0;
  const exerciseCount = plan.days?.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0) ?? 0;

  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={() => navigate(`/trainer/workouts/${plan.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{plan.name}</h3>
          {studentName && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">Aluno: {studentName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`badge ${STATUS_STYLE[plan.status] ?? "badge-gray"}`}>
            {STATUS_LABEL[plan.status] ?? plan.status}
          </span>
          <div
            className="relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden animate-scale-in">
                <button
                  onClick={() => navigate(`/trainer/workouts/${plan.id}`)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Editar treino
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDuplicate(plan); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Duplicar
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete(plan); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          {dayCount} dia{dayCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
          </svg>
          {exerciseCount} exercício{exerciseCount !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto">
          {formatDate(plan.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  const navigate                       = useNavigate();
  const { plans, loading, deletePlan, duplicatePlan } = useWorkouts();
  const { students }                   = useStudents();
  const [search, setSearch]            = useState("");
  const [duplicating, setDuplicating]  = useState(null);

  const studentMap = useMemo(() => {
    return Object.fromEntries(students.map(s => [s.id, s.name]));
  }, [students]);

  const filtered = useMemo(() => {
    if (!search) return plans;
    return plans.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (studentMap[p.studentId] ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }, [plans, search, studentMap]);

  async function handleDelete(plan) {
    if (!window.confirm(`Excluir "${plan.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deletePlan(plan.id);
      toast.success("Plano excluído.");
    } catch { toast.error("Erro ao excluir."); }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Treinos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{plans.length} plano{plans.length !== 1 ? "s" : ""} criado{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => navigate("/trainer/workouts/new")}
          className="btn-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Novo treino
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome do plano ou aluno..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            }
            title={search ? "Nenhum plano encontrado" : "Nenhum plano criado ainda"}
            description={search ? "Tente outro termo de busca." : "Crie o primeiro plano de treino para seus alunos."}
            action={!search && (
              <button onClick={() => navigate("/trainer/workouts/new")} className="btn-primary">
                Criar primeiro treino
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              studentName={studentMap[plan.studentId]}
              onDelete={handleDelete}
              onDuplicate={setDuplicating}
            />
          ))}
        </div>
      )}

      <DuplicateModal
        open={!!duplicating}
        onClose={() => setDuplicating(null)}
        plan={duplicating}
        students={students}
        onConfirm={duplicatePlan}
      />
    </div>
  );
}