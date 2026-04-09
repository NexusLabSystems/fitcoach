// src/pages/trainer/AssessmentsPage.jsx
import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { db }          from "@/lib/firebase";
import { useAuth }     from "@/contexts/AuthContext";
import { useStudents } from "@/hooks/useStudents";
import Modal           from "@/components/ui/Modal";
import Avatar          from "@/components/ui/Avatar";
import EmptyState      from "@/components/ui/EmptyState";
import toast           from "react-hot-toast";
import { format }      from "date-fns";
import { ptBR }        from "date-fns/locale";
import clsx            from "clsx";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function formatDateShort(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yy", { locale: ptBR });
}

// ── Pollock 7 ──────────────────────────────────────────────────
function pollock7(gender, age, folds) {
  const sum = ["chest","axillary","tricep","subscapular","abdominal","suprailiac","thigh"]
    .map(k => parseFloat(folds[k]) || 0).reduce((a, b) => a + b, 0);
  let density;
  if (gender === "M") {
    density = 1.112 - (0.00043499 * sum) + (0.00000055 * sum ** 2) - (0.00028826 * age);
  } else {
    density = 1.097 - (0.00046971 * sum) + (0.00000056 * sum ** 2) - (0.00012828 * age);
  }
  return ((4.95 / density) - 4.5) * 100;
}

const SKINFOLD_FIELDS = [
  { key: "chest",       label: "Peitoral" },
  { key: "axillary",    label: "Axilar média" },
  { key: "tricep",      label: "Tríceps" },
  { key: "subscapular", label: "Subescapular" },
  { key: "abdominal",   label: "Abdominal" },
  { key: "suprailiac",  label: "Suprailíaca" },
  { key: "thigh",       label: "Coxa" },
];

// ── Tooltip customizado ────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-4 py-3 text-sm bg-white border border-gray-200 shadow-lg rounded-xl">
      <p className="mb-2 font-semibold text-gray-700">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-gray-900">{p.value}{p.dataKey === "fatPct" || p.dataKey === "fatPctGoal" ? "%" : " kg"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Evolution chart ────────────────────────────────────────────
function EvolutionChart({ assessments, studentName }) {
  const [metric, setMetric] = useState("fatPct");

  const chartData = useMemo(() => {
    return [...assessments]
      .filter(a => a[metric] != null)
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0))
      .map(a => ({
        date:     formatDateShort(a.createdAt),
        fatPct:   a.fatPct   != null ? parseFloat(a.fatPct.toFixed(1))   : null,
        weight:   a.weight   != null ? parseFloat(a.weight.toFixed(1))   : null,
        leanMass: a.leanMass != null ? parseFloat(a.leanMass.toFixed(1)) : null,
      }));
  }, [assessments, metric]);

  const METRICS = [
    { key: "fatPct",   label: "% Gordura", color: "#FF5722", unit: "%" },
    { key: "weight",   label: "Peso",      color: "#3b82f6", unit: "kg" },
    { key: "leanMass", label: "Massa magra", color: "#00D4AA", unit: "kg" },
  ];

  const current = METRICS.find(m => m.key === metric);

  // Calcula delta entre primeira e última leitura
  const delta = useMemo(() => {
    const vals = chartData.map(d => d[metric]).filter(v => v != null);
    if (vals.length < 2) return null;
    return (vals[vals.length - 1] - vals[0]).toFixed(1);
  }, [chartData, metric]);

  const deltaPositive = metric === "leanMass" ? Number(delta) > 0 : Number(delta) < 0;

  if (chartData.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex items-center justify-center w-10 h-10 mb-3 bg-gray-100 rounded-xl">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <p className="text-sm text-gray-400">
          {chartData.length === 0
            ? "Nenhuma avaliação com dados numéricos para este aluno."
            : "Registre pelo menos 2 avaliações para visualizar a evolução."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Metric selector + delta */}
      <div className="flex flex-col justify-between gap-3 mb-5 sm:flex-row sm:items-center">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                metric === m.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}>
              {m.label}
            </button>
          ))}
        </div>

        {delta !== null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Variação total:</span>
            <span className={clsx("text-sm font-semibold",
              deltaPositive ? "text-green-500" : "text-red-500"
            )}>
              {Number(delta) > 0 ? "+" : ""}{delta}{current.unit}
            </span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Inicial",  value: chartData[0]?.[metric],                   },
          { label: "Atual",    value: chartData[chartData.length - 1]?.[metric], accent: true },
          { label: "Avaliações", value: assessments.length, noUnit: true },
        ].map(card => (
          <div key={card.label} className={clsx("card p-4 text-center",
            card.accent && "border-brand-200 bg-brand-50"
          )}>
            <p className={clsx("text-xl font-semibold",
              card.accent ? "text-brand-600" : "text-gray-900"
            )}>
              {card.value ?? "—"}{!card.noUnit && card.value != null ? current.unit : ""}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}${current.unit}`}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={metric}
              name={current.label}
              stroke={current.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: current.color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: current.color, stroke: "white", strokeWidth: 2 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

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
      const r = pollock7(gender, Number(age), folds);
      return isNaN(r) ? null : r.toFixed(1);
    } catch { return null; }
  }, [protocol, age, gender, folds]);

  const leanMass = useMemo(() => {
    if (!fatPct || !weight) return null;
    return (Number(weight) * (1 - Number(fatPct) / 100)).toFixed(1);
  }, [fatPct, weight]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studentId || !weight) { toast.error("Selecione o aluno e informe o peso."); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "assessments"), {
        trainerId, studentId,
        protocol,
        weight:   parseFloat(weight),
        height:   parseFloat(height) || null,
        fatPct:   fatPct   ? parseFloat(fatPct)   : null,
        leanMass: leanMass ? parseFloat(leanMass) : null,
        folds,
        date:      serverTimestamp(),
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
          <div>
            <label className="label">Aluno *</label>
            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input" disabled={loading}>
              <option value="">Selecionar aluno</option>
              {students.filter(s => s.status === "active").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><label className="label">Peso (kg) *</label>
              <input type="number" step="0.1" placeholder="75.0" value={weight} onChange={e => setWeight(e.target.value)} className="input" /></div>
            <div><label className="label">Altura (cm)</label>
              <input type="number" placeholder="175" value={height} onChange={e => setHeight(e.target.value)} className="input" /></div>
            <div><label className="label">Idade</label>
              <input type="number" placeholder="30" value={age} onChange={e => setAge(e.target.value)} className="input" /></div>
            <div><label className="label">Gênero</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="input">
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Protocolo</label>
            <div className="flex gap-2">
              {[{v:"pollock7",l:"Pollock 7"},{v:"bioimpedance",l:"Bioimpedância"},{v:"manual",l:"Manual"}].map(opt => (
                <button key={opt.v} type="button" onClick={() => setProtocol(opt.v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    protocol === opt.v ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {protocol === "pollock7" && (
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Dobras cutâneas (mm)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SKINFOLD_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="label">{f.label}</label>
                    <input type="number" step="0.1" placeholder="0.0"
                      value={folds[f.key] ?? ""}
                      onChange={e => setFolds(p => ({ ...p, [f.key]: e.target.value }))}
                      className="input" />
                  </div>
                ))}
              </div>
              {fatPct && (
                <div className="grid grid-cols-3 gap-4 p-4 mt-4 text-center border bg-brand-50 rounded-xl border-brand-100">
                  <div>
                    <p className="mb-1 text-xs text-gray-400">% Gordura</p>
                    <p className="text-xl font-semibold text-brand-600">{fatPct}%</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-400">Massa magra</p>
                    <p className="text-xl font-semibold text-gray-900">{leanMass} kg</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-400">Massa gorda</p>
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
            {loading ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</> : "Salvar avaliação"}
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
  const [selectedStudent, setSelectedStudent] = useState("all");

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

  // Alunos que têm pelo menos 1 avaliação
  const studentsWithAssessments = useMemo(() => {
    const ids = [...new Set(assessments.map(a => a.studentId))];
    return ids.map(id => students.find(s => s.id === id)).filter(Boolean);
  }, [assessments, students]);

  const filteredAssessments = useMemo(() => {
    if (selectedStudent === "all") return assessments;
    return assessments.filter(a => a.studentId === selectedStudent);
  }, [assessments, selectedStudent]);

  // Avaliações do aluno selecionado para o gráfico
  const chartAssessments = useMemo(() => {
    if (selectedStudent === "all") return [];
    return assessments.filter(a => a.studentId === selectedStudent);
  }, [assessments, selectedStudent]);

  const selectedStudentObj = students.find(s => s.id === selectedStudent);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Avaliações</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {assessments.length} avaliação{assessments.length !== 1 ? "ões" : ""} registrada{assessments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova avaliação
        </button>
      </div>

      {/* Student filter */}
      {studentsWithAssessments.length > 0 && (
        <div className="flex gap-2 pb-1 mb-6 overflow-x-auto">
          <button onClick={() => setSelectedStudent("all")}
            className={clsx("flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              selectedStudent === "all" ? "bg-brand-500 text-white shadow-brand" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}>
            Todos
          </button>
          {studentsWithAssessments.map(s => (
            <button key={s.id} onClick={() => setSelectedStudent(s.id)}
              className={clsx("flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                selectedStudent === s.id ? "bg-brand-500 text-white shadow-brand" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}>
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Evolution chart — só aparece quando um aluno está selecionado */}
      {selectedStudent !== "all" && chartAssessments.length > 0 && (
        <div className="p-6 mb-6 card">
          <div className="flex items-center gap-3 mb-5">
            <Avatar name={selectedStudentObj?.name ?? ""} size="md" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{selectedStudentObj?.name}</h2>
              <p className="text-xs text-gray-400">Evolução ao longo do tempo</p>
            </div>
          </div>
          <EvolutionChart
            assessments={chartAssessments}
            studentName={selectedStudentObj?.name ?? ""}
          />
        </div>
      )}

      {/* Assessments table */}
      {loading ? (
        <div className="overflow-hidden card">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="bg-gray-100 rounded-full w-9 h-9" />
              <div className="flex-1"><div className="w-1/3 h-3 mb-2 bg-gray-100 rounded" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            title="Nenhuma avaliação registrada"
            description="Registre avaliações físicas para acompanhar a evolução dos alunos."
            action={<button onClick={() => setModalOpen(true)} className="btn-primary">Nova avaliação</button>}
          />
        </div>
      ) : (
        <div className="overflow-hidden card">
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_100px_100px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
            {["Aluno","Protocolo","Peso","% Gordura","Massa magra","Data"].map(h => (
              <span key={h} className="text-xs font-medium tracking-wide text-gray-400 uppercase">{h}</span>
            ))}
          </div>
          {filteredAssessments.map(a => {
            const student = studentMap[a.studentId];
            return (
              <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_100px_100px] gap-4 px-6 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={student?.name ?? "?"} size="sm" />
                  <span className="text-sm font-medium text-gray-900">{student?.name ?? "—"}</span>
                </div>
                <span className="hidden text-xs text-gray-500 capitalize sm:block">
                  {a.protocol === "pollock7" ? "Pollock 7" : a.protocol}
                </span>
                <span className="hidden text-sm text-gray-700 sm:block">{a.weight ? `${a.weight} kg` : "—"}</span>
                <span className={clsx("text-sm font-medium hidden sm:block", a.fatPct ? "text-brand-500" : "text-gray-400")}>
                  {a.fatPct ? `${a.fatPct}%` : "—"}
                </span>
                <span className="hidden text-sm text-gray-500 sm:block">{a.leanMass ? `${a.leanMass} kg` : "—"}</span>
                <span className="hidden text-xs text-gray-400 sm:block">{formatDate(a.createdAt)}</span>
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