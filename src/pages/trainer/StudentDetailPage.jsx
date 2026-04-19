// src/pages/trainer/StudentDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStudents }    from "@/hooks/useStudents";
import { useInvite }      from "@/hooks/useInvite";
import { useAuth }        from "@/contexts/AuthContext";
import StudentFormModal   from "@/components/students/StudentFormModal";
import AvatarUpload       from "@/components/ui/AvatarUpload";
import EvolutionPhotos    from "@/components/students/EvolutionPhotos";
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

// ── Helpers de composição corporal ───────────────────────────
function calcBMI(w, h) { return w && h ? w / Math.pow(h / 100, 2) : null; }
function classifyBMI(v) {
  if (v == null) return null;
  if (v < 18.5) return "Abaixo do peso";
  if (v < 25)   return "Adequado";
  if (v < 30)   return "Sobrepeso";
  if (v < 35)   return "Obesidade I";
  if (v < 40)   return "Obesidade II";
  return "Obesidade III";
}
function calcWHR(waist, hip) { return waist && hip ? waist / hip : null; }
function classifyFat(pct, gender) {
  if (pct == null) return null;
  const t = gender === "M" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  const i = t.findIndex(v => pct < v);
  return ["Essencial", "Atlético", "Fitness", "Médio", "Obesidade"][i === -1 ? 4 : i];
}
function calcSumFoldsSD(folds) {
  if (!folds) return null;
  const sum = ["chest","axillary","tricep","subscapular","abdominal","suprailiac","thigh"]
    .reduce((a, k) => a + (parseFloat(folds[k]) || 0), 0);
  return sum > 0 ? sum : null;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">{label}</span>
      <span className="text-sm text-gray-900 text-right max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const { getStudent, archiveStudent, reactivateStudent } = useStudents();
  const { createInvite } = useInvite();
  const { user, profile: trainerProfile } = useAuth();

  const [student, setStudent]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("overview");
  const [editOpen, setEditOpen]     = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [workouts, setWorkouts]         = useState([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [payments, setPayments]               = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [assessments, setAssessments]         = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => { fetchStudent(); }, [id]);

  useEffect(() => {
    if (tab !== "workouts" || !id || !user) return;
    setWorkoutsLoading(true);
    getDocs(query(
      collection(db, "workoutPlans"),
      where("trainerId", "==", user.uid),
      where("studentId", "==", id),
    ))
      .then(snap => setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error("Erro ao buscar treinos:", err))
      .finally(() => setWorkoutsLoading(false));
  }, [tab, id, user]);

  useEffect(() => {
    if (tab !== "assessments" || !id || !user) return;
    setAssessmentsLoading(true);
    getDocs(query(
      collection(db, "assessments"),
      where("trainerId", "==", user.uid),
    ))
      .then(snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(a => a.studentId === id);
        data.sort((a, b) =>
          (a.date?.seconds ?? a.createdAt?.seconds ?? 0) -
          (b.date?.seconds ?? b.createdAt?.seconds ?? 0)
        );
        setAssessments(data);
      })
      .catch(err => console.error("Erro ao buscar avaliações:", err))
      .finally(() => setAssessmentsLoading(false));
  }, [tab, id, user]);

  useEffect(() => {
    if (tab !== "payments" || !id || !user) return;
    setPaymentsLoading(true);
    getDocs(query(
      collection(db, "payments"),
      where("trainerId", "==", user.uid),
      where("studentId", "==", id),
    ))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setPayments(data);
      })
      .catch(err => console.error("Erro ao buscar cobranças:", err))
      .finally(() => setPaymentsLoading(false));
  }, [tab, id, user]);

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

  async function handleGenerateInvite() {
    setInviteLoading(true);
    try {
      const token = await createInvite({
        studentId:    student.id,
        studentName:  student.name,
        studentEmail: student.email ?? null,
        trainerId:    trainerProfile.uid,
        trainerName:  trainerProfile.name,
      });
      const link = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Link de convite copiado!");
    } catch (err) {
      console.error("Erro ao gerar convite:", err);
      toast.error("Erro ao gerar convite.");
    } finally {
      setInviteLoading(false);
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
        <div className="w-32 h-4 mb-8 bg-gray-100 rounded" />
        <div className="p-6 mb-6 card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full" />
            <div>
              <div className="w-40 h-5 mb-2 bg-gray-100 rounded" />
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
      <div className="p-6 mb-6 card">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <AvatarUpload
              name={student.name}
              src={student.photoURL}
              userId={student.id}
              collection="students"
              docId={student.id}
              field="photoURL"
              size="xl"
              onUploaded={(url) => setStudent(prev => ({ ...prev, photoURL: url }))}
            />
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
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="btn-secondary text-sm px-3 py-1.5"
              title="Gerar link de convite para o aluno"
            >
              {inviteLoading ? (
                <span className="w-4 h-4 border-2 border-gray-400 rounded-full border-t-transparent animate-spin" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              )}
              Convidar
            </button>
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
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-gray-50">
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
      <div className="flex gap-1 p-1 mb-6 bg-gray-100 rounded-xl w-fit">
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 animate-fade-in">
          <div className="p-5 card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Informações pessoais</h3>
            <InfoRow label="Email"           value={student.email} />
            <InfoRow label="Telefone"        value={student.phone} />
            <InfoRow label="Nascimento"      value={student.birthDate ? format(new Date(student.birthDate), "dd/MM/yyyy") : null} />
            <InfoRow label="Gênero"          value={student.gender === "M" ? "Masculino" : student.gender === "F" ? "Feminino" : student.gender} />
            <InfoRow label="Objetivo"        value={student.goal} />
          </div>

          <div className="p-5 card">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Notas do treinador</h3>
            {student.notes ? (
              <p className="text-sm leading-relaxed text-gray-600">{student.notes}</p>
            ) : (
              <p className="text-sm text-gray-300">Nenhuma observação.</p>
            )}
          </div>
        </div>
      )}

      {tab === "workouts" && (
        <div className="card animate-fade-in overflow-hidden">
          {workoutsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <EmptyState
              icon={
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                </svg>
              }
              title="Nenhum treino atribuído"
              description="Crie um plano de treino e atribua a este aluno."
              action={
                <button onClick={() => navigate("/trainer/workouts/new")} className="text-sm btn-primary">
                  Criar treino
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {workouts.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => navigate(`/trainer/workouts/${plan.id}`)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{plan.name}</p>
                    <p className="text-xs text-gray-400">{plan.days?.length ?? 0} dia{plan.days?.length !== 1 ? "s" : ""} de treino</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "assessments" && (
        <div className="flex flex-col gap-6 animate-fade-in">

          {/* Tabela comparativa */}
          {assessmentsLoading ? (
            <div className="p-6 card animate-pulse">
              <div className="w-48 h-4 mb-4 bg-gray-100 rounded" />
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-9 bg-gray-100 rounded" />)}
              </div>
            </div>
          ) : assessments.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
                title="Nenhuma avaliação registrada"
                description="Acesse a página de Avaliações para registrar a primeira avaliação deste aluno."
                action={<button onClick={() => navigate("/trainer/assessments")} className="btn-primary text-sm">Ver avaliações</button>}
              />
            </div>
          ) : (() => {
            const fmt = ts => {
              if (!ts) return "—";
              const d = ts.toDate ? ts.toDate() : new Date(ts);
              return format(d, "dd/MM/yyyy", { locale: ptBR });
            };
            const delta = (curr, prev, positiveIsGood) => {
              if (curr == null || prev == null) return null;
              const diff = curr - prev;
              if (Math.abs(diff) < 0.01) return null;
              const good = positiveIsGood ? diff > 0 : diff < 0;
              return (
                <span className={clsx("ml-1 text-xs", good ? "text-green-500" : "text-red-500")}>
                  {diff > 0 ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
                </span>
              );
            };
            const rows = [
              { label: "Peso (kg)",          get: a => a.weight,                                           fmt: v => v,                   pos: false },
              { label: "Altura (cm)",         get: a => a.height,                                           fmt: v => v,                   pos: null  },
              { label: "IMC (kg/m²)",         get: a => { const b = calcBMI(a.weight, a.height); return b ? +b.toFixed(1) : null; }, fmt: v => v, pos: false, sub: a => classifyBMI(calcBMI(a.weight, a.height)) },
              { label: "% Gordura",           get: a => a.fatPct,                                           fmt: v => `${v}%`,             pos: false, sub: a => classifyFat(a.fatPct, a.gender) },
              { label: "Massa gorda (kg)",    get: a => a.weight && a.fatPct != null ? +(a.weight * a.fatPct / 100).toFixed(1) : null, fmt: v => v, pos: false },
              { label: "Massa magra (kg)",    get: a => a.leanMass,                                         fmt: v => v,                   pos: true  },
              { label: "RCQ",                 get: a => { const w = calcWHR(a.circumferences?.waist, a.circumferences?.hip); return w ? +w.toFixed(2) : null; }, fmt: v => v, pos: false },
              { label: "Somatório dobras",    get: a => { const s = calcSumFoldsSD(a.folds); return s ? +s.toFixed(1) : null; }, fmt: v => `${v} mm`, pos: false },
            ];
            return (
              <div className="overflow-hidden card">
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Evolução da composição corporal</h3>
                  <p className="mt-0.5 text-xs text-gray-400">{assessments.length} avaliação{assessments.length !== 1 ? "ões" : ""} registrada{assessments.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-3 text-xs font-medium tracking-wide text-left text-gray-400 uppercase whitespace-nowrap">Parâmetro</th>
                        {assessments.map(a => (
                          <th key={a.id} className="px-4 py-3 text-xs font-medium text-center text-gray-600 whitespace-nowrap">
                            {fmt(a.date ?? a.createdAt)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const vals = assessments.map(a => row.get(a));
                        if (vals.every(v => v == null)) return null;
                        return (
                          <tr key={row.label} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                            <td className="px-5 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{row.label}</td>
                            {assessments.map((a, i) => {
                              const val = row.get(a);
                              const prev = i > 0 ? row.get(assessments[i - 1]) : null;
                              const sub = row.sub ? row.sub(a) : null;
                              return (
                                <td key={a.id} className="px-4 py-3 text-center">
                                  <div className="text-sm font-medium text-gray-900">
                                    {val != null ? row.fmt(val) : "—"}
                                    {row.pos != null && delta(val, prev, row.pos)}
                                  </div>
                                  {sub && val != null && (
                                    <div className="text-xs text-gray-400">{sub}</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Fotos de evolução */}
          <div className="p-6 card">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Fotos de evolução</h3>
            <EvolutionPhotos studentId={student.id} />
          </div>
        </div>
      )}

      {tab === "payments" && (
        <div className="card animate-fade-in overflow-hidden">
          {paymentsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
                </svg>
              }
              title="Nenhuma cobrança registrada"
              description="Crie cobranças mensais para este aluno."
              action={
                <button onClick={() => navigate("/trainer/payments")} className="text-sm btn-primary">
                  Nova cobrança
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {payments.map(p => {
                const STATUS = {
                  pending:  { label: "Pendente",  style: "badge-gold" },
                  paid:     { label: "Pago",      style: "badge-green" },
                  overdue:  { label: "Atrasado",  style: "badge-red" },
                  canceled: { label: "Cancelado", style: "badge-gray" },
                };
                const due = p.dueDate?.toDate ? p.dueDate.toDate() : new Date(p.dueDate);
                const formatted = due.toLocaleDateString("pt-BR");
                const amount = Number(p.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                const s = STATUS[p.status] ?? { label: p.status, style: "badge-gray" };
                return (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.description}</p>
                      <p className="text-xs text-gray-400">Venc. {formatted}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{amount}</p>
                    <span className={`badge ${s.style}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
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