// src/components/exercises/ExerciseFormModal.jsx
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useExercises, MUSCLE_GROUPS, DIFFICULTIES, EQUIPMENT } from "@/hooks/useExercises";
import toast from "react-hot-toast";

const EMPTY = {
  name:        "",
  muscleGroup: "",
  difficulty:  "básico",
  equipment:   "",
  videoUrl:    "",
  description: "",
};

export default function ExerciseFormModal({ open, onClose, exercise }) {
  const { createExercise, updateExercise } = useExercises();
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const isEditing = !!exercise;

  useEffect(() => {
    setForm(exercise ? {
      name:        exercise.name        ?? "",
      muscleGroup: exercise.muscleGroup ?? "",
      difficulty:  exercise.difficulty  ?? "básico",
      equipment:   exercise.equipment   ?? "",
      videoUrl:    exercise.videoUrl    ?? "",
      description: exercise.description ?? "",
    } : EMPTY);
  }, [exercise, open]);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim())        { toast.error("Nome é obrigatório.");          return; }
    if (!form.muscleGroup)        { toast.error("Selecione o grupo muscular.");  return; }

    setLoading(true);
    try {
      if (isEditing) {
        await updateExercise(exercise.id, form);
        toast.success("Exercício atualizado!");
      } else {
        await createExercise(form);
        toast.success("Exercício criado!");
      }
      onClose();
    } catch { toast.error("Erro ao salvar."); }
    finally   { setLoading(false); }
  }

  // Detecta se é link do YouTube e monta embed
  const youtubeId = (() => {
    if (!form.videoUrl) return null;
    const m = form.videoUrl.match(/(?:youtu\.be\/|v=)([^&\s]+)/);
    return m ? m[1] : null;
  })();

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Editar exercício" : "Novo exercício"} size="md">
      <form onSubmit={handleSubmit}>
        <Modal.Body className="flex flex-col gap-4">

          {/* Nome */}
          <div>
            <label className="label">Nome *</label>
            <input name="name" type="text" placeholder="Ex: Supino reto com barra"
              value={form.name} onChange={handleChange} className="input" disabled={loading} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Grupo muscular */}
            <div>
              <label className="label">Grupo muscular *</label>
              <select name="muscleGroup" value={form.muscleGroup} onChange={handleChange}
                className="input" disabled={loading}>
                <option value="">Selecionar</option>
                {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Dificuldade */}
            <div>
              <label className="label">Dificuldade</label>
              <select name="difficulty" value={form.difficulty} onChange={handleChange}
                className="input" disabled={loading}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Equipamento */}
          <div>
            <label className="label">Equipamento</label>
            <select name="equipment" value={form.equipment} onChange={handleChange}
              className="input" disabled={loading}>
              <option value="">Nenhum / não especificado</option>
              {EQUIPMENT.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Vídeo */}
          <div>
            <label className="label">Link do vídeo (YouTube)</label>
            <input name="videoUrl" type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={form.videoUrl} onChange={handleChange}
              className="input" disabled={loading} />
            {youtubeId && (
              <div className="mt-2 overflow-hidden bg-black rounded-xl aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                  title="Preview"
                />
              </div>
            )}
          </div>

          {/* Descrição / execução */}
          <div>
            <label className="label">Instruções de execução</label>
            <textarea name="description" rows={3}
              placeholder="Ex: Deite no banco, pegada na largura dos ombros, desça a barra até o peito..."
              value={form.description} onChange={handleChange}
              className="resize-none input" disabled={loading} />
          </div>

        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
              : isEditing ? "Salvar alterações" : "Criar exercício"
            }
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}