// src/pages/trainer/AssessmentsPage.jsx
import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { db }          from "@/lib/firebase";
import { useAuth }     from "@/contexts/AuthContext";
import { useStudents } from "@/hooks/useStudents";
import Modal           from "@/components/ui/Modal";
import Avatar          from "@/components/ui/Avatar";
import EmptyState      from "@/components/ui/EmptyState";
import toast           from "react-hot-toast";
import { format }      from "date-fns";
import { ptBR }        from "date-fns/locale";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

// ── Pollock 7 dobras — cálculo de % gordura ────────────────────
function pollock7(gender, age, { chest, axillary, tricep, subscapular, abdominal, suprailiac, thigh }) {
  const sum = [chest, axillary, tricep, subscapular, abdominal, suprailiac, thigh]
    .map(v => parseFloat(v) || 0)
    .reduce((a, b) => a + b, 0);

  let density;
  if (gender === "M") {
    density = 1.112 - (0.00043499 * sum) + (0.00000055 * sum ** 2) - (0.00028826 * age);
  } else {
    density = 1.097 - (0.00046971 * sum) + (0.00000056 * sum ** 2) - (0.00012828 * age);
  }
  return ((4.95 / density) - 4.5) * 100;
}

const SKINFOLD_FIELDS_M = [
  { key: "chest",        label: "Peitoral" },
  { key: "axillary",     label: "Axilar média" },
  { key: "tricep",       label: "Tríceps" },
  { key: "subscapular",  label: "Subescapular" },
  { key: "abdominal",    label: "Abdominal" },
  { key: "suprailiac",   label: "Suprailíaca" },
  { key: "thigh",        label: "Coxa" },
];

// ── New assessment modal ───────────────────────────────────────
function NewAssessmentModal({ open, onClose, students, trainerId }) {
  const [studentId, setStudentId] = useState("");
  const [weight, setWeight]       = useState("");
  const [height, setHeight]       = useState("");
  const [age, setAge]             = useState("");
  const [gender, setGender]       = useState("M");
  const [protocol, setProtocol]   = useState("pollock7");
  const [folds, setFolds]         = useState({});
  const [loading, setLoading]     = useState(false);

  const fatPct = useMemo(() => {
    if (protocol !== "pollock7" || !age || !gender) return null;
    try {
      const result = pollock7(gender, Number(age), folds);
      return isNaN(result) ? null : result.toFixed(1);
    } catch { return null; }
  }, [protocol, age, gender, folds]);

  const leanMass = useMemo(() => {
    if (!fatPct || !weight) return null;
    return (Number(weight) * (1 - Number(fatPct) / 100)).toFixed(1);
  }, [fatPct, weight]);

  function handleFold(key, val) {
    setFolds(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studentId || !weight) { toast.error("Selecione o aluno e informe o peso."); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "assessments"), {
        trainerId,
        studentId,
        protocol,
        weight:   parseFloat(weight),
        height:   parseFloat(height) || null,
        fatPct:   fatPct ? parseFloat(fatPct) : null,
        leanMass: leanMass ? parseFloat(leanMass) : null,
        folds,
        date:     serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      toast.success("Avaliação registrada!");
      onClose();
      setStudentId(""); setWeight(""); setHeight(""); setAge(""); setFolds({});
    } catch { toast.error("Erro ao salvar."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova avaliação física" size="lg">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-5">
          {/* Aluno */}
          <div>
            <label className="label">Aluno *</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input" disabled={loading}>
              <option value="">Selecionar aluno</option>
              {students.filter(s => s.status === "active").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Dados gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Peso (kg) *</label>
              <input type="number" step="0.1" placeholder="75.0" value={weight} onChange={e => setWeight(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Altura (cm)</label>
              <input type="number" placeholder="175" value={height} onChange={e => setHeight(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Idade</label>
              <input type="number" placeholder="30" value={age} onChange={e => setAge(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Gênero</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="input">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          {/* Protocolo */}
          <div>
            <label className="label">Protocolo</label>
            <div className="flex gap-2">
              {[
                { value: "pollock7", label: "Pollock 7 dobras" },
                { value: "bioimpedance", label: "Bioimpedância" },
                { value: "manual", label: "Manual" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setProtocol(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                    ${protocol === opt.value ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pollock 7 dobras */}
          {protocol === "pollock7" && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Dobras cutâneas (mm)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SKINFOLD_FIELDS_M.map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input type="number" step="0.1" placeholder="0.0"
                      value={folds[f.key] ?? ""}
                      onChange={e => handleFold(f.key, e.target.value)}
                      className="input" />
                  </div>
                ))}
              </div>

              {/* Resultado calculado */}
              {fatPct && (
                <div className="mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">% Gordura</p>
                    <p className="text-xl font-semibold text-brand-600">{fatPct}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Massa magra</p>
                    <p className="text-xl font-semibold text-gray-900">{leanMass} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Massa gorda</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {(Number(weight) * Number(fatPct) / 100).toFixed(1)} kg
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</> : "Salvar avaliação"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function AssessmentsPage() {
  const { user }     = useAuth();
  const { students } = useStudents();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "assessments"), where("trainerId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setAssessments(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const studentMap = useMemo(() =>
    Object.fromEntries(students.map(s => [s.id, s])), [students]);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Avaliações</h1>
          <p className="text-sm text-gray-400 mt-0.5">{assessments.length} avaliação{assessments.length !== 1 ? "ões" : ""} registrada{assessments.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova avaliação
        </button>
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100" />
              <div className="flex-1"><div className="h-3 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            title="Nenhuma avaliação registrada"
            description="Registre avaliações físicas para acompanhar a evolução dos alunos."
            action={<button onClick={() => setModalOpen(true)} className="btn-primary">Nova avaliação</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Aluno</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Protocolo</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Peso</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">% Gordura</span>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Data</span>
          </div>
          {assessments.map(a => {
            const student = studentMap[a.studentId];
            return (
              <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_100px] gap-4 px-6 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={student?.name ?? "?"} size="sm" />
                  <span className="text-sm font-medium text-gray-900">{student?.name ?? "—"}</span>
                </div>
                <span className="text-xs text-gray-500 capitalize hidden sm:block">{a.protocol === "pollock7" ? "Pollock 7" : a.protocol}</span>
                <span className="text-sm text-gray-700 hidden sm:block">{a.weight ? `${a.weight} kg` : "—"}</span>
                <span className={`text-sm font-medium hidden sm:block ${a.fatPct ? "text-brand-500" : "text-gray-400"}`}>
                  {a.fatPct ? `${a.fatPct}%` : "—"}
                </span>
                <span className="text-xs text-gray-400 hidden sm:block">{formatDate(a.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}

      <NewAssessmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        students={students}
        trainerId={user?.uid}
      />
    </div>
  );
}