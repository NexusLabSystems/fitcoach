// src/components/students/StudentFormModal.jsx
// ─────────────────────────────────────────────────────────────
// Modal de cadastro / edição de aluno.
// Passa `student` para editar, omite para criar.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useStudents } from "@/hooks/useStudents";
import toast from "react-hot-toast";

const EMPTY = {
  name:      "",
  email:     "",
  phone:     "",
  birthDate: "",
  gender:    "",
  goal:      "",
  notes:     "",
};

const GOALS = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento físico",
  "Reabilitação",
  "Saúde geral",
  "Performance esportiva",
];

export default function StudentFormModal({ open, onClose, student }) {
  const { createStudent, updateStudent } = useStudents();
  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const isEditing = !!student;

  // Preenche o form ao editar
  useEffect(() => {
    if (student) {
      setForm({
        name:      student.name      ?? "",
        email:     student.email     ?? "",
        phone:     student.phone     ?? "",
        birthDate: student.birthDate ?? "",
        gender:    student.gender    ?? "",
        goal:      student.goal      ?? "",
        notes:     student.notes     ?? "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [student, open]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.email.trim()) { toast.error("Email é obrigatório."); return; }

    setLoading(true);
    try {
      if (isEditing) {
        await updateStudent(student.id, form);
        toast.success("Aluno atualizado!");
      } else {
        await createStudent(form);
        toast.success("Aluno cadastrado!");
      }
      onClose();
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar aluno" : "Novo aluno"}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Nome */}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Nome completo *</label>
            <input
              id="name" name="name" type="text" autoComplete="off"
              placeholder="Ex: Maria Silva"
              value={form.name} onChange={handleChange}
              className="input" disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="label" htmlFor="email">Email *</label>
            <input
              id="email" name="email" type="email" autoComplete="off"
              placeholder="aluno@email.com"
              value={form.email} onChange={handleChange}
              className="input" disabled={loading}
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="label" htmlFor="phone">WhatsApp / Telefone</label>
            <input
              id="phone" name="phone" type="tel"
              placeholder="(82) 99999-9999"
              value={form.phone} onChange={handleChange}
              className="input" disabled={loading}
            />
          </div>

          {/* Data de nascimento */}
          <div>
            <label className="label" htmlFor="birthDate">Data de nascimento</label>
            <input
              id="birthDate" name="birthDate" type="date"
              value={form.birthDate} onChange={handleChange}
              className="input" disabled={loading}
            />
          </div>

          {/* Gênero */}
          <div>
            <label className="label" htmlFor="gender">Gênero</label>
            <select
              id="gender" name="gender"
              value={form.gender} onChange={handleChange}
              className="input" disabled={loading}
            >
              <option value="">Selecionar</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="outro">Prefiro não informar</option>
            </select>
          </div>

          {/* Objetivo */}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="goal">Objetivo principal</label>
            <select
              id="goal" name="goal"
              value={form.goal} onChange={handleChange}
              className="input" disabled={loading}
            >
              <option value="">Selecionar</option>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Observações */}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="notes">Observações</label>
            <textarea
              id="notes" name="notes"
              placeholder="Restrições, informações importantes..."
              rows={3}
              value={form.notes} onChange={handleChange}
              className="input resize-none"
              disabled={loading}
            />
          </div>

        </Modal.Body>

        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
            ) : isEditing ? "Salvar alterações" : "Cadastrar aluno"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}