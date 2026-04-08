// src/pages/trainer/StudentDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStudents }    from "@/hooks/useStudents";
import StudentFormModal   from "@/components/students/StudentFormModal";
import Avatar             from "@/components/ui/Avatar";
import EmptyState         from "@/components/ui/EmptyState";
import toast              from "react-hot-toast";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import clsx from "clsx";

const TABS = [
  { id: "overview",    label: "Visão geral" },
  { id: "workouts",    label: "Treinos" },
  { id: "assessments", label: "Avaliações" },
  { id: "payments",    label: "Financeiro" },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const { getStudent, archiveStudent, reactivateStudent } = useStudents();

  const [student, setStudent]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("overview");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { fetchStudent(); }, [id]);

  async function fetchStudent() {
    try {
      const data = await getStudent(id);
      setStudent(data);
    } catch {
      toast.error("Aluno não encontrado.");
      navigate("/trainer/students");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm(`Arquivar ${student.name}?`)) return;
    try {
      await archiveStudent(id);
      setStudent(prev => ({ ...prev, status: "inactive" }));
      toast.success("Aluno arquivado.");
    } catch { toast.error("Erro ao arquivar."); }
  }

  async function handleReactivate() {
    try {
      await reactivateStudent(id);
      setStudent(prev => ({ ...prev, status: "active" }));
      toast.success("Aluno reativado!");
    } catch { toast.error("Erro ao reativar."); }
  }

  function calcAge(birthDate) {
    if (!birthDate) return null;
    return differenceInYears(new Date(), new Date(birthDate));
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-32 mb-8" />
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100" />
            <div>
              <div className="h-5 bg-gray-100 rounded w-40 mb-2" />
              <div className="h-3.5 bg-gray-100 rounded w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) return null;
  const age = calcAge(student.birthDate);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">

      {/* Back */}
      <button
        onClick={() => navigate("/trainer/students")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Alunos
      </button>

      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} size="xl" />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-semibold text-gray-900">{student.name}</h1>
                <span className={`badge ${student.status === "active" ? "badge-green" : "badge-gray"}`}>
                  {student.status === "active" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="text-sm text-gray-400">{student.email}</p>
              {student.phone && <p className="text-sm text-gray-400">{student.phone}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setEditOpen(true)} className="btn-secondary text-sm px-3 py-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
              </svg>
              Editar
            </button>
            {student.status === "active" ? (
              <button onClick={handleArchive} className="btn-ghost text-sm px-3 py-1.5 text-red-400 hover:bg-red-50 hover:text-red-500">
                Arquivar
              </button>
            ) : (
              <button onClick={handleReactivate} className="btn-ghost text-sm px-3 py-1.5 text-green-600 hover:bg-green-50">
                Reativar
              </button>
            )}
          </div>
        </div>

        {/* Quick info pills */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
          {age && (
            <span className="badge-gray">{age} anos</span>
          )}
          {student.gender && (
            <span className="badge-gray">
              {student.gender === "M" ? "Masculino" : student.gender === "F" ? "Feminino" : "Outro"}
            </span>
          )}
          {student.goal && (
            <span className="badge-orange">{student.goal}</span>
          )}
          <span className="badge-gray">Desde {formatDate(student.createdAt)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Informações pessoais</h3>
            <InfoRow label="Email"           value={student.email} />
            <InfoRow label="Telefone"        value={student.phone} />
            <InfoRow label="Nascimento"      value={student.birthDate ? format(new Date(student.birthDate), "dd/MM/yyyy") : null} />
            <InfoRow label="Gênero"          value={student.gender === "M" ? "Masculino" : student.gender === "F" ? "Feminino" : student.gender} />
            <InfoRow label="Objetivo"        value={student.goal} />
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Notas do treinador</h3>
            {student.notes ? (
              <p className="text-sm text-gray-600 leading-relaxed">{student.notes}</p>
            ) : (
              <p className="text-sm text-gray-300">Nenhuma observação.</p>
            )}
          </div>
        </div>
      )}

      {tab === "workouts" && (
        <div className="card animate-fade-in">
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            }
            title="Nenhum treino atribuído"
            description="Crie um plano de treino e atribua a este aluno."
            action={
              <button className="btn-primary text-sm">
                Criar treino
              </button>
            }
          />
        </div>
      )}

      {tab === "assessments" && (
        <div className="card animate-fade-in">
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            }
            title="Nenhuma avaliação registrada"
            description="Registre a primeira avaliação física do aluno."
            action={
              <button className="btn-primary text-sm">
                Nova avaliação
              </button>
            }
          />
        </div>
      )}

      {tab === "payments" && (
        <div className="card animate-fade-in">
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
              </svg>
            }
            title="Nenhuma cobrança registrada"
            description="Crie cobranças mensais para este aluno."
            action={
              <button className="btn-primary text-sm">
                Nova cobrança
              </button>
            }
          />
        </div>
      )}

      {/* Edit modal */}
      <StudentFormModal
        open={editOpen}
        onClose={() => { setEditOpen(false); fetchStudent(); }}
        student={student}
      />
    </div>
  );
}