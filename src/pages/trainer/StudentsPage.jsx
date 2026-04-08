// src/pages/trainer/StudentsPage.jsx
import { useState, useMemo } from "react";
import { useNavigate }       from "react-router-dom";
import { useStudents }       from "@/hooks/useStudents";
import StudentFormModal      from "@/components/students/StudentFormModal";
import Avatar                from "@/components/ui/Avatar";
import EmptyState            from "@/components/ui/EmptyState";
import toast                 from "react-hot-toast";
import { format }            from "date-fns";
import { ptBR }              from "date-fns/locale";

const STATUS_OPTIONS = [
  { value: "all",      label: "Todos" },
  { value: "active",   label: "Ativos" },
  { value: "inactive", label: "Inativos" },
];

const GOAL_COLORS = {
  "Hipertrofia":             "badge-orange",
  "Emagrecimento":           "badge-teal",
  "Condicionamento físico":  "badge-green",
  "Reabilitação":            "badge-gray",
  "Saúde geral":             "badge-green",
  "Performance esportiva":   "badge-gold",
};

export default function StudentsPage() {
  const { students, loading, stats, archiveStudent, reactivateStudent } = useStudents();
  const navigate = useNavigate();

  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [menuOpen, setMenuOpen]     = useState(null); // student id com menu aberto

  // ── Filtragem ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          s.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  // ── Handlers ───────────────────────────────────────────────
  function openCreate() { setEditStudent(null); setModalOpen(true); }
  function openEdit(s)  { setEditStudent(s);    setModalOpen(true); setMenuOpen(null); }

  async function handleArchive(student) {
    setMenuOpen(null);
    try {
      await archiveStudent(student.id);
      toast.success(`${student.name} arquivado.`);
    } catch { toast.error("Erro ao arquivar."); }
  }

  async function handleReactivate(student) {
    setMenuOpen(null);
    try {
      await reactivateStudent(student.id);
      toast.success(`${student.name} reativado!`);
    } catch { toast.error("Erro ao reativar."); }
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in" onClick={() => setMenuOpen(null)}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Alunos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {stats.total} cadastrados · {stats.active} ativos
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Novo aluno
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table / List ────────────────────────────────────── */}
      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 w-16 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            }
            title={search ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado"}
            description={
              search
                ? "Tente um termo diferente ou limpe o filtro."
                : "Comece cadastrando seu primeiro aluno."
            }
            action={
              !search && (
                <button onClick={openCreate} className="btn-primary">
                  Cadastrar primeiro aluno
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Table header — desktop only */}
          <div className="hidden sm:grid grid-cols-[1fr_180px_120px_80px_44px] gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Aluno</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Objetivo</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cadastro</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</span>
            <span />
          </div>

          {/* Rows */}
          {filtered.map(student => (
            <div
              key={student.id}
              className="grid grid-cols-[1fr_44px] sm:grid-cols-[1fr_180px_120px_80px_44px] gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer items-center transition-colors"
              onClick={() => navigate(`/trainer/students/${student.id}`)}
            >
              {/* Name + email */}
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={student.name} size="md" className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-400 truncate">{student.email}</p>
                </div>
              </div>

              {/* Objetivo */}
              <div className="hidden sm:block">
                {student.goal ? (
                  <span className={GOAL_COLORS[student.goal] ?? "badge-gray"}>{student.goal}</span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>

              {/* Cadastro */}
              <span className="hidden sm:block text-xs text-gray-400">
                {formatDate(student.createdAt)}
              </span>

              {/* Status */}
              <span className={`hidden sm:inline-flex badge ${student.status === "active" ? "badge-green" : "badge-gray"}`}>
                {student.status === "active" ? "Ativo" : "Inativo"}
              </span>

              {/* Actions menu */}
              <div
                className="relative"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setMenuOpen(menuOpen === student.id ? null : student.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>

                {menuOpen === student.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden animate-scale-in">
                    <button
                      onClick={() => navigate(`/trainer/students/${student.id}`)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Ver perfil
                    </button>
                    <button
                      onClick={() => openEdit(student)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
                      </svg>
                      Editar
                    </button>
                    <div className="border-t border-gray-100" />
                    {student.status === "active" ? (
                      <button
                        onClick={() => handleArchive(student)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                        </svg>
                        Arquivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(student)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                        </svg>
                        Reativar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de cadastro/edição */}
      <StudentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        student={editStudent}
      />
    </div>
  );
}