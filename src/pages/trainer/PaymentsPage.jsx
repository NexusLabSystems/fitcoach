// src/pages/trainer/PaymentsPage.jsx
import { useState, useMemo, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
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
import clsx            from "clsx";

const STATUS = {
  pending:  { label: "Pendente",  style: "badge-gold" },
  paid:     { label: "Pago",      style: "badge-green" },
  overdue:  { label: "Atrasado",  style: "badge-red" },
  canceled: { label: "Cancelado", style: "badge-gray" },
};

const FILTER_OPTIONS = [
  { value: "all",     label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "overdue", label: "Atrasadas" },
  { value: "paid",    label: "Pagas" },
];

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function formatCurrency(val) {
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Edit payment modal ─────────────────────────────────────────
function EditPaymentModal({ open, onClose, payment, students }) {
  const dueDateStr = payment?.dueDate
    ? format(payment.dueDate.toDate ? payment.dueDate.toDate() : new Date(payment.dueDate), "yyyy-MM-dd")
    : "";

  const [form, setForm]       = useState({ studentId: "", amount: "", dueDate: "", description: "", status: "pending" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (payment) {
      setForm({
        studentId:   payment.studentId ?? "",
        amount:      payment.amount ?? "",
        dueDate:     dueDateStr,
        description: payment.description ?? "",
        status:      payment.status ?? "pending",
      });
    }
  }, [payment]);

  function handleChange(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId || !form.amount || !form.dueDate) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    setLoading(true);
    try {
      const updates = {
        studentId:   form.studentId,
        amount:      parseFloat(form.amount),
        dueDate:     new Date(form.dueDate),
        description: form.description,
        status:      form.status,
      };
      if (form.status === "paid" && payment.status !== "paid") {
        updates.paidAt = serverTimestamp();
      }
      await updateDoc(doc(db, "payments", payment.id), updates);
      toast.success("Cobrança atualizada!");
      onClose();
    } catch { toast.error("Erro ao atualizar cobrança."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar cobrança">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-4">
          <div>
            <label className="label">Aluno *</label>
            <select name="studentId" value={form.studentId} onChange={handleChange} className="input" disabled={loading}>
              <option value="">Selecionar aluno</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" name="amount" min="0" step="0.01" placeholder="150,00"
                value={form.amount} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <div>
              <label className="label">Vencimento *</label>
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="input" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} className="input" disabled={loading} />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input" disabled={loading}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Atrasado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</> : "Salvar alterações"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

// ── New payment modal ──────────────────────────────────────────
function NewPaymentModal({ open, onClose, students, trainerId }) {
  const [form, setForm]       = useState({ studentId: "", amount: "", dueDate: "", description: "Mensalidade" });
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId || !form.amount || !form.dueDate) {
      toast.error("Preencha todos os campos obrigatórios."); return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "payments"), {
        trainerId,
        studentId:   form.studentId,
        amount:      parseFloat(form.amount),
        dueDate:     new Date(form.dueDate),
        description: form.description,
        status:      "pending",
        createdAt:   serverTimestamp(),
      });
      toast.success("Cobrança criada!");
      onClose();
      setForm({ studentId: "", amount: "", dueDate: "", description: "Mensalidade" });
    } catch { toast.error("Erro ao criar cobrança."); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova cobrança">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-4">
          <div>
            <label className="label">Aluno *</label>
            <select name="studentId" value={form.studentId} onChange={handleChange} className="input" disabled={loading}>
              <option value="">Selecionar aluno</option>
              {students.filter(s => s.status === "active").map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor (R$) *</label>
              <input type="number" name="amount" min="0" step="0.01" placeholder="150,00"
                value={form.amount} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <div>
              <label className="label">Vencimento *</label>
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} className="input" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} className="input" disabled={loading} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Criando...</> : "Criar cobrança"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default function PaymentsPage() {
  const { user }         = useAuth();
  const { students }     = useStudents();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [modalOpen, setModalOpen]     = useState(false);
  const [editPayment, setEditPayment] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "payments"), where("trainerId", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPayments(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const studentMap = useMemo(() =>
    Object.fromEntries(students.map(s => [s.id, s])),
    [students]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    return payments.filter(p => p.status === filter);
  }, [payments, filter]);

  const stats = useMemo(() => ({
    total:    payments.reduce((s, p) => p.status === "paid" ? s + p.amount : s, 0),
    pending:  payments.filter(p => p.status === "pending").length,
    overdue:  payments.filter(p => p.status === "overdue").length,
  }), [payments]);

  async function markAsPaid(payment) {
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status: "paid",
        paidAt: serverTimestamp(),
      });
      toast.success("Pagamento confirmado!");
    } catch { toast.error("Erro ao atualizar."); }
  }

  async function markAsOverdue(payment) {
    try {
      await updateDoc(doc(db, "payments", payment.id), { status: "overdue" });
      toast.success("Marcado como atrasado.");
    } catch { toast.error("Erro ao atualizar."); }
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-400 mt-0.5">{payments.length} cobrança{payments.length !== 1 ? "s" : ""} no total</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nova cobrança
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Recebido</p>
          <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.total)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Pendentes</p>
          <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Atrasadas</p>
          <p className={clsx("text-2xl font-semibold", stats.overdue > 0 ? "text-red-500" : "text-gray-900")}>{stats.overdue}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setFilter(opt.value)}
            className={clsx("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              filter === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-100" />
              <div className="flex-1"><div className="h-3 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-2.5 bg-gray-100 rounded w-1/4" /></div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>}
            title="Nenhuma cobrança encontrada"
            description="Crie cobranças para controlar os pagamentos dos seus alunos."
            action={filter === "all" && <button onClick={() => setModalOpen(true)} className="btn-primary">Nova cobrança</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {filtered.map(payment => {
            const student = studentMap[payment.studentId];
            return (
              <div key={payment.id} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                <Avatar name={student?.name ?? "?"} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{student?.name ?? "Aluno removido"}</p>
                  <p className="text-xs text-gray-400">{payment.description} · Venc. {formatDate(payment.dueDate)}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 hidden sm:block">{formatCurrency(payment.amount)}</p>
                <span className={`badge ${STATUS[payment.status]?.style ?? "badge-gray"}`}>
                  {STATUS[payment.status]?.label ?? payment.status}
                </span>
                {/* Actions */}
                <div className="flex gap-1">
                  {(payment.status === "pending" || payment.status === "overdue") && (
                    <>
                      <button onClick={() => markAsPaid(payment)} className="text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors whitespace-nowrap">
                        Marcar pago
                      </button>
                      {payment.status === "pending" && (() => {
                        const due = payment.dueDate?.toDate ? payment.dueDate.toDate() : new Date(payment.dueDate);
                        return due < new Date();
                      })() && (
                        <button onClick={() => markAsOverdue(payment)} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-medium transition-colors whitespace-nowrap">
                          Atrasado
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => setEditPayment(payment)} className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors" title="Editar cobrança">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        students={students}
        trainerId={user?.uid}
      />

      <EditPaymentModal
        open={!!editPayment}
        onClose={() => setEditPayment(null)}
        payment={editPayment}
        students={students}
      />
    </div>
  );
}