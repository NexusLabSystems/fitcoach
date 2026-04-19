// src/pages/trainer/AssessmentsPage.jsx
import { useState, useEffect, useMemo } from "react";
import TutorialTour from "@/components/ui/TutorialTour";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
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

// ── Helpers de composição corporal ───────────────────────────
function calcBMI(weight, height) {
  if (!weight || !height) return null;
  return weight / Math.pow(height / 100, 2);
}
function classifyBMI(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25)   return "Adequado";
  if (bmi < 30)   return "Sobrepeso";
  if (bmi < 35)   return "Obesidade I";
  if (bmi < 40)   return "Obesidade II";
  return "Obesidade III";
}
function calcWHR(waist, hip) {
  if (!waist || !hip) return null;
  return waist / hip;
}
function classifyWHR(whr, gender) {
  if (whr == null) return null;
  const t = gender === "M" ? [0.85, 0.90, 0.95] : [0.75, 0.80, 0.85];
  const i = t.findIndex(v => whr < v);
  return ["Baixo", "Moderado", "Alto", "Muito alto"][i === -1 ? 3 : i];
}
function calcCMB(armCirc, tricepFold) {
  if (!armCirc || !tricepFold) return null;
  return armCirc - (Math.PI * tricepFold / 10);
}
function classifyFat(fatPct, gender) {
  if (fatPct == null) return null;
  const t = gender === "M" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  const i = t.findIndex(v => fatPct < v);
  return ["Essencial", "Atlético", "Fitness", "Médio", "Obesidade"][i === -1 ? 4 : i];
}
function calcSumFolds(folds) {
  if (!folds) return null;
  const keys = ["chest","axillary","tricep","subscapular","abdominal","suprailiac","thigh"];
  const sum = keys.reduce((a, k) => a + (parseFloat(folds[k]) || 0), 0);
  return sum > 0 ? sum : null;
}

const SKINFOLD_FIELDS = [
  { key: "chest",       label: "Peitoral" },
  { key: "axillary",    label: "Axilar média" },
  { key: "tricep",      label: "Tríceps" },
  { key: "bicep",       label: "Bíceps" },
  { key: "subscapular", label: "Subescapular" },
  { key: "abdominal",   label: "Abdominal" },
  { key: "suprailiac",  label: "Suprailíaca" },
  { key: "thigh",       label: "Coxa" },
];

const CIRCUMFERENCE_FIELDS = [
  { key: "neck",           label: "Pescoço" },
  { key: "shoulder",       label: "Ombro" },
  { key: "chest",          label: "Tórax" },
  { key: "waist",          label: "Cintura" },
  { key: "abdomen",        label: "Abdômen" },
  { key: "hip",            label: "Quadril" },
  { key: "armR",           label: "Braço Relax. D" },
  { key: "armL",           label: "Braço Relax. E" },
  { key: "armContractedR", label: "Braço Contr. D" },
  { key: "armContractedL", label: "Braço Contr. E" },
  { key: "forearmR",       label: "Antebraço D" },
  { key: "forearmL",       label: "Antebraço E" },
  { key: "thighProxR",     label: "Coxa Prox. D" },
  { key: "thighProxL",     label: "Coxa Prox. E" },
  { key: "thighR",         label: "Coxa Med. D" },
  { key: "thighL",         label: "Coxa Med. E" },
  { key: "thighDistR",     label: "Coxa Dist. D" },
  { key: "thighDistL",     label: "Coxa Dist. E" },
  { key: "calfR",          label: "Panturrilha D" },
  { key: "calfL",          label: "Panturrilha E" },
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
      .sort((a, b) => (a.date?.seconds ?? a.createdAt?.seconds ?? 0) - (b.date?.seconds ?? b.createdAt?.seconds ?? 0))
      .map(a => ({
        date:     formatDateShort(a.date ?? a.createdAt),
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

// ── Assessment detail modal (Opção A) ─────────────────────────
function AssessmentDetailModal({ assessment, student, onClose }) {
  if (!assessment) return null;
  const { weight, height, fatPct, leanMass, folds, circumferences, protocol, notes, gender, age } = assessment;

  const bmi       = calcBMI(weight, height);
  const whr       = calcWHR(circumferences?.waist, circumferences?.hip);
  const cmb       = calcCMB(circumferences?.armR, folds?.tricep);
  const fatMass   = weight && fatPct != null ? +(weight * fatPct / 100).toFixed(1) : null;
  const leanCalc  = weight && fatMass != null ? +(weight - fatMass).toFixed(1) : (leanMass ?? null);
  const sumFolds  = calcSumFolds(folds);
  const residual  = weight ? +(weight * (gender === "M" ? 0.207 : 0.241)).toFixed(1) : null;
  const fatPct100 = fatPct ?? 0;

  const METRICS = [
    { label: "Peso",             value: weight   ? `${weight} kg`            : null },
    { label: "Altura",           value: height   ? `${height} cm`            : null },
    { label: "IMC",              value: bmi      ? `${bmi.toFixed(1)} kg/m²` : null, sub: classifyBMI(bmi) },
    { label: "RCQ",              value: whr      ? whr.toFixed(2)            : null, sub: classifyWHR(whr, gender) },
    { label: "CMB",              value: cmb      ? `${cmb.toFixed(1)} cm`    : null },
    { label: "% Gordura",        value: fatPct   != null ? `${fatPct}%`      : null, sub: classifyFat(fatPct, gender), accent: true },
    { label: "Massa gorda",      value: fatMass  != null ? `${fatMass} kg`   : null },
    { label: "Massa magra",      value: leanCalc != null ? `${leanCalc} kg`  : null },
    { label: "Massa residual",   value: residual ? `${residual} kg`          : null },
    { label: "Somatório dobras", value: sumFolds ? `${sumFolds.toFixed(1)} mm` : null },
  ].filter(m => m.value != null);

  return (
    <Modal open={!!assessment} onClose={onClose} title="Resultado da avaliação" size="lg">
      <Modal.Body className="flex flex-col gap-6">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Avatar name={student?.name ?? "?"} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{student?.name}</p>
            <p className="text-xs text-gray-400">
              {formatDate(assessment.date ?? assessment.createdAt)} · {protocol === "pollock7" ? "Pollock 7" : protocol}
              {age ? ` · ${age} anos` : ""} · {gender === "M" ? "Masc." : "Fem."}
            </p>
          </div>
        </div>

        {/* Barra composição corporal */}
        {weight && fatMass != null && leanCalc != null && (
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Composição corporal</p>
            <div className="flex overflow-hidden h-8 rounded-xl">
              <div className="flex items-center justify-center text-xs font-semibold text-white bg-red-400"
                style={{ width: `${fatPct100}%` }}>
                {fatPct100}%
              </div>
              <div className="flex items-center justify-center text-xs font-semibold text-white bg-brand-500"
                style={{ width: `${(100 - fatPct100).toFixed(1)}%` }}>
                {(100 - fatPct100).toFixed(1)}%
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />Gorda ({fatMass} kg)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />Magra ({leanCalc} kg)
              </span>
              {residual && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />Residual ({residual} kg)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Índices calculados */}
        {METRICS.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Índices calculados</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {METRICS.map(m => (
                <div key={m.label} className={clsx("p-3 rounded-xl border",
                  m.accent ? "border-brand-100 bg-brand-50" : "border-gray-100 bg-gray-50")}>
                  <p className="text-xs text-gray-400 mb-0.5">{m.label}</p>
                  <p className={clsx("text-base font-semibold", m.accent ? "text-brand-600" : "text-gray-900")}>{m.value}</p>
                  {m.sub && <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dobras */}
        {protocol === "pollock7" && folds && Object.values(folds).some(v => v) && (
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Dobras cutâneas (mm)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {SKINFOLD_FIELDS.filter(f => folds[f.key]).map(f => (
                <div key={f.key} className="p-2.5 text-center bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{folds[f.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Circunferências */}
        {circumferences && Object.values(circumferences).some(v => v) && (
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Circunferências (cm)</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CIRCUMFERENCE_FIELDS.filter(f => circumferences[f.key]).map(f => (
                <div key={f.key} className="p-2.5 text-center bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400">{f.label}</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{circumferences[f.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        {notes && (
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Observações</p>
            <p className="text-sm leading-relaxed text-gray-600">{notes}</p>
          </div>
        )}

      </Modal.Body>
      <Modal.Footer>
        <button type="button" onClick={onClose} className="btn-secondary">Fechar</button>
      </Modal.Footer>
    </Modal>
  );
}

// ── New assessment modal ───────────────────────────────────────
function NewAssessmentModal({ open, onClose, students, trainerId }) {
  const [studentId, setStudentId]   = useState("");
  const [weight, setWeight]         = useState("");
  const [height, setHeight]         = useState("");
  const [age, setAge]               = useState("");
  const [gender, setGender]         = useState("M");
  const [protocol, setProtocol]     = useState("pollock7");
  const [folds, setFolds]           = useState({});
  const [circumferences, setCirc]   = useState({});
  const [directFatPct, setDirectFat]     = useState("");
  const [directLeanMass, setDirectLean]  = useState("");
  const [notes, setNotes]           = useState("");
  const [assessDate, setAssessDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading]       = useState(false);

  // % gordura calculado pelo Pollock 7
  const fatPctCalc = useMemo(() => {
    if (protocol !== "pollock7" || !age || !gender) return null;
    try {
      const r = pollock7(gender, Number(age), folds);
      return isNaN(r) ? null : r.toFixed(1);
    } catch { return null; }
  }, [protocol, age, gender, folds]);

  // Para Pollock 7 usa o calculado; para bio/manual usa o digitado
  const fatPct  = protocol === "pollock7" ? fatPctCalc  : (directFatPct  || null);
  const leanMass = useMemo(() => {
    if (!fatPct || !weight) return null;
    return (Number(weight) * (1 - Number(fatPct) / 100)).toFixed(1);
  }, [fatPct, weight]);
  const finalLeanMass = protocol === "pollock7" ? leanMass : (directLeanMass || leanMass || null);

  function reset() {
    setStudentId(""); setWeight(""); setHeight(""); setAge(""); setGender("M");
    setProtocol("pollock7"); setFolds({}); setCirc({});
    setDirectFat(""); setDirectLean(""); setNotes("");
    setAssessDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studentId || !weight) { toast.error("Selecione o aluno e informe o peso."); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, "assessments"), {
        trainerId, studentId,
        protocol,
        gender,
        age:           parseInt(age) || null,
        weight:        parseFloat(weight),
        height:        parseFloat(height) || null,
        fatPct:        fatPct        ? parseFloat(fatPct)        : null,
        leanMass:      finalLeanMass ? parseFloat(finalLeanMass) : null,
        folds:         protocol === "pollock7" ? folds : {},
        circumferences,
        notes:         notes.trim() || null,
        date:          new Date(assessDate + "T12:00:00"),
        createdAt:     serverTimestamp(),
      });
      toast.success("Avaliação registrada!");
      reset();
      onClose();
    } catch { toast.error("Erro ao salvar."); }
    finally { setLoading(false); }
  }

  const resultCard = fatPct ? (
    <div className="grid grid-cols-3 gap-4 p-4 mt-4 text-center border bg-brand-50 rounded-xl border-brand-100">
      <div>
        <p className="mb-1 text-xs text-gray-400">% Gordura</p>
        <p className="text-xl font-semibold text-brand-600">{fatPct}%</p>
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-400">Massa magra</p>
        <p className="text-xl font-semibold text-gray-900">{finalLeanMass ?? "—"} kg</p>
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-400">Massa gorda</p>
        <p className="text-xl font-semibold text-gray-900">
          {weight ? (Number(weight) * Number(fatPct) / 100).toFixed(1) : "—"} kg
        </p>
      </div>
    </div>
  ) : null;

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

          {/* Dados básicos */}
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

          {/* Data da avaliação */}
          <div className="w-full sm:w-48">
            <label className="label">Data da avaliação</label>
            <input type="date" value={assessDate} onChange={e => setAssessDate(e.target.value)}
              className="input" max={new Date().toISOString().slice(0, 10)} />
          </div>

          {/* Protocolo */}
          <div>
            <label className="label">Protocolo de composição corporal</label>
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

          {/* Pollock 7 — dobras */}
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
              {resultCard}
            </div>
          )}

          {/* Bioimpedância / Manual — entrada direta */}
          {(protocol === "bioimpedance" || protocol === "manual") && (
            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">
                {protocol === "bioimpedance" ? "Resultado da bioimpedância" : "Composição corporal"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">% Gordura</label>
                  <input type="number" step="0.1" placeholder="18.5"
                    value={directFatPct} onChange={e => setDirectFat(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Massa magra (kg)</label>
                  <input type="number" step="0.1" placeholder="61.5"
                    value={directLeanMass} onChange={e => setDirectLean(e.target.value)} className="input" />
                </div>
              </div>
              {resultCard}
            </div>
          )}

          {/* Circunferências */}
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-gray-500 uppercase">Circunferências (cm) — opcional</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CIRCUMFERENCE_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input type="number" step="0.1" placeholder="0.0"
                    value={circumferences[f.key] ?? ""}
                    onChange={e => setCirc(p => ({ ...p, [f.key]: e.target.value }))}
                    className="input" />
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="label">Observações</label>
            <textarea rows={3} placeholder="Anotações livres sobre a avaliação..."
              value={notes} onChange={e => setNotes(e.target.value)}
              className="input resize-none" />
          </div>

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

const TOUR_KEY   = "fitcoach_tour_trainer_assessments";
const TOUR_STEPS = [
  {
    target: null,
    icon: "📏",
    title: "Avaliações físicas",
    description: "Aqui você registra e acompanha as avaliações físicas de cada aluno. O sistema calcula automaticamente composição corporal, IMC, RCQ e muito mais.",
  },
  {
    target: "new-assessment-btn",
    icon: "➕",
    title: "Registrar nova avaliação",
    description: "Clique para abrir o formulário de avaliação. Escolha entre três protocolos: Pollock 7 (dobras cutâneas com cálculo automático de % gordura), Bioimpedância (insere o resultado direto) ou Manual (valores livres). Você também registra circunferências e observações.",
  },
  {
    target: "assessment-filter",
    icon: "📊",
    title: "Filtro por aluno + gráfico de evolução",
    description: "Filtre as avaliações por aluno clicando no nome dele. Ao selecionar um aluno, um gráfico de evolução aparece acima da tabela mostrando a variação de % gordura, peso ou massa magra ao longo do tempo.",
  },
  {
    target: "assessment-table",
    icon: "🔍",
    title: "Histórico de avaliações",
    description: "Cada linha mostra o aluno, protocolo, peso, % gordura, massa magra e data. Clique em qualquer linha para abrir o relatório completo com barra de composição corporal, índices calculados, tabela de dobras e circunferências.",
  },
];

// ── Main page ──────────────────────────────────────────────────
export default function AssessmentsPage() {
  const { user }     = useAuth();
  const { students } = useStudents();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]               = useState(false);
  const [selectedStudent, setSelectedStudent]   = useState("all");
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showTour, setShowTour]                 = useState(() => !localStorage.getItem(TOUR_KEY));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "assessments"), where("trainerId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.date?.seconds ?? b.createdAt?.seconds ?? 0) - (a.date?.seconds ?? a.createdAt?.seconds ?? 0));
      setAssessments(data);
      setLoading(false);
    });
    return () => { try { unsub(); } catch {} };
  }, [user]);

  const studentMap = useMemo(() =>
    Object.fromEntries(students.map(s => [s.id, s])), [students]);

  async function handleDelete(assessment) {
    if (!window.confirm("Excluir esta avaliação? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteDoc(doc(db, "assessments", assessment.id));
      toast.success("Avaliação excluída.");
    } catch { toast.error("Erro ao excluir."); }
  }

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
        <button data-tutorial="new-assessment-btn" onClick={() => setModalOpen(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova avaliação
        </button>
      </div>

      {/* Student filter */}
      {studentsWithAssessments.length > 0 && (
        <div data-tutorial="assessment-filter" className="flex gap-2 pb-1 mb-6 overflow-x-auto">
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
        <div data-tutorial="assessment-table" className="overflow-hidden card">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="bg-gray-100 rounded-full w-9 h-9" />
              <div className="flex-1"><div className="w-1/3 h-3 mb-2 bg-gray-100 rounded" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div data-tutorial="assessment-table" className="card">
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
            title="Nenhuma avaliação registrada"
            description="Registre avaliações físicas para acompanhar a evolução dos alunos."
            action={<button onClick={() => setModalOpen(true)} className="btn-primary">Nova avaliação</button>}
          />
        </div>
      ) : (
        <div data-tutorial="assessment-table" className="overflow-hidden card">
          <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_100px_100px_40px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
            {["Aluno","Protocolo","Peso","% Gordura","Massa magra","Data",""].map((h, i) => (
              <span key={i} className="text-xs font-medium tracking-wide text-gray-400 uppercase">{h}</span>
            ))}
          </div>
          {filteredAssessments.map(a => {
            const student = studentMap[a.studentId];
            return (
              <div key={a.id} onClick={() => setSelectedAssessment(a)} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_100px_100px_40px] gap-4 px-6 py-4 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50 transition-colors cursor-pointer">
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
                <span className="hidden text-xs text-gray-400 sm:block">{formatDate(a.date ?? a.createdAt)}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(a); }} title="Excluir avaliação"
                  className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
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

      <AssessmentDetailModal
        assessment={selectedAssessment}
        student={selectedAssessment ? studentMap[selectedAssessment.studentId] : null}
        onClose={() => setSelectedAssessment(null)}
      />

      {showTour && (
        <TutorialTour
          steps={TOUR_STEPS}
          storageKey={TOUR_KEY}
          onDone={() => setShowTour(false)}
        />
      )}
    </div>
  );
}