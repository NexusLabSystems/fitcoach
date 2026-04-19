// src/pages/trainer/ExercisesPage.jsx
import { useState, useMemo } from "react";
import { useExercises, MUSCLE_GROUPS } from "@/hooks/useExercises";
import ExerciseFormModal from "@/components/exercises/ExerciseFormModal";
import VideoModal, { youtubeThumbnail } from "@/components/ui/VideoModal";
import EmptyState        from "@/components/ui/EmptyState";
import TutorialTour      from "@/components/ui/TutorialTour";
import toast             from "react-hot-toast";
import clsx              from "clsx";

const TOUR_KEY   = "fitcoach_tour_trainer_exercises";
const TOUR_STEPS = [
  {
    target: null,
    icon: "💪",
    title: "Biblioteca de exercícios",
    description: "Aqui ficam todos os exercícios disponíveis para montar treinos. A biblioteca inclui exercícios padrão da plataforma e os que você criar.",
  },
  {
    target: "new-exercise-btn",
    icon: "➕",
    title: "Criar exercício personalizado",
    description: "Cadastre exercícios exclusivos com nome, grupo muscular, nível de dificuldade, equipamento, descrição e link de vídeo do YouTube. Eles ficam disponíveis só para você ao montar treinos.",
  },
  {
    target: "exercises-filters",
    icon: "🔍",
    title: "Busca e filtro por grupo muscular",
    description: "Busque pelo nome do exercício ou filtre por grupo muscular (Peito, Costas, Pernas, etc.). Os filtros se combinam para uma busca precisa.",
  },
  {
    target: "exercises-grid",
    icon: "🃏",
    title: "Cards de exercícios",
    description: "Cada card mostra a miniatura do vídeo (clique para assistir), nome, grupo muscular, dificuldade e equipamento. Exercícios criados por você têm o botão ⋮ para editar ou excluir.",
  },
];

const DIFF_STYLE = {
  básico:        "badge-green",
  intermediário: "badge-gold",
  avançado:      "badge-red",
};

const GROUP_COLORS = {
  Peito:   "bg-orange-50 text-orange-600 border-orange-200",
  Costas:  "bg-blue-50 text-blue-600 border-blue-200",
  Ombros:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  Bíceps:  "bg-red-50 text-red-600 border-red-200",
  Tríceps: "bg-purple-50 text-purple-600 border-purple-200",
  Pernas:  "bg-teal-50 text-teal-600 border-teal-200",
  Glúteos: "bg-teal-50 text-teal-700 border-teal-200",
  Core:    "bg-gray-100 text-gray-600 border-gray-200",
  Cardio:  "bg-gray-100 text-gray-600 border-gray-200",
  Outro:   "bg-gray-100 text-gray-500 border-gray-200",
};

// ── Exercise card ──────────────────────────────────────────────
function ExerciseCard({ exercise, onEdit, onDelete, onPlay, isOwned }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const groupStyle  = GROUP_COLORS[exercise.muscleGroup] ?? GROUP_COLORS.Outro;
  const thumbnail   = youtubeThumbnail(exercise.videoUrl);

  return (
    <div className="overflow-hidden transition-shadow card hover:shadow-md">
      {/* Thumbnail / placeholder */}
      <div className="relative overflow-hidden bg-gray-100 aspect-video">
        {thumbnail ? (
          <img src={thumbnail} alt={exercise.name}
            className="object-cover w-full h-full" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
            </svg>
          </div>
        )}
        {exercise.videoUrl && (
          <button
            onClick={() => onPlay(exercise)}
            className="absolute inset-0 flex items-center justify-center transition-colors bg-black/0 hover:bg-black/30 group"
          >
            <div className="flex items-center justify-center w-10 h-10 transition-opacity rounded-full opacity-0 bg-white/90 group-hover:opacity-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF5722">
                <path d="M5 3l14 9-14 9V3z"/>
              </svg>
            </div>
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold leading-tight text-gray-900">{exercise.name}</p>

          {/* Menu — só para exercícios do trainer */}
          {isOwned && (
            <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center justify-center text-gray-400 rounded-lg w-7 h-7 hover:bg-gray-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-10 mt-1 overflow-hidden bg-white border border-gray-200 shadow-lg top-full w-36 rounded-xl animate-scale-in">
                  <button onClick={() => { setMenuOpen(false); onEdit(exercise); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
                    </svg>
                    Editar
                  </button>
                  <div className="border-t border-gray-100" />
                  <button onClick={() => { setMenuOpen(false); onDelete(exercise); }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                    Excluir
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className={`badge border text-xs ${groupStyle}`}>
            {exercise.muscleGroup}
          </span>
          <span className={`badge ${DIFF_STYLE[exercise.difficulty] ?? "badge-gray"}`}>
            {exercise.difficulty}
          </span>
          {exercise.equipment && (
            <span className="badge badge-gray">{exercise.equipment}</span>
          )}
        </div>

        {exercise.description && (
          <p className="mt-2 text-xs text-gray-400 line-clamp-2">{exercise.description}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function ExercisesPage() {
  const { exercises, loading, deleteExercise } = useExercises();
  const [search, setSearch]         = useState("");
  const [groupFilter, setGroup]     = useState("Todos");
  const [modalOpen, setModalOpen]   = useState(false);
  const [editExercise, setEdit]     = useState(null);
  const [videoExercise, setVideo]   = useState(null);
  const [showTour, setShowTour]     = useState(() => !localStorage.getItem(TOUR_KEY));

  const filtered = useMemo(() => {
    return exercises.filter(ex => {
      const mGroup  = groupFilter === "Todos" || ex.muscleGroup === groupFilter;
      const mSearch = ex.name.toLowerCase().includes(search.toLowerCase());
      return mGroup && mSearch;
    });
  }, [exercises, search, groupFilter]);

  function openCreate() { setEdit(null);       setModalOpen(true); }
  function openEdit(ex) { setEdit(ex);         setModalOpen(true); }

  async function handleDelete(ex) {
    if (!window.confirm(`Excluir "${ex.name}"?`)) return;
    try {
      await deleteExercise(ex.id);
      toast.success("Exercício excluído.");
    } catch { toast.error("Erro ao excluir."); }
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in" onClick={() => {}}>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 mb-8 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Biblioteca de exercícios</h1>
          <p className="text-sm text-gray-400 mt-0.5">{exercises.length} exercício{exercises.length !== 1 ? "s" : ""}</p>
        </div>
        <button data-tutorial="new-exercise-btn" onClick={openCreate} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Novo exercício
        </button>
      </div>

      {/* Filters */}
      <div data-tutorial="exercises-filters" className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1">
          <svg className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Buscar exercício..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {["Todos", ...MUSCLE_GROUPS].map(g => (
            <button key={g} onClick={() => setGroup(g)}
              className={clsx("px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                groupFilter === g
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div data-tutorial="exercises-grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="overflow-hidden card animate-pulse">
              <div className="bg-gray-100 aspect-video" />
              <div className="p-4">
                <div className="h-3.5 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="w-1/2 h-3 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div data-tutorial="exercises-grid" className="card">
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            }
            title={search ? "Nenhum exercício encontrado" : "Biblioteca vazia"}
            description={search ? "Tente outro termo de busca." : "Crie seu primeiro exercício personalizado."}
            action={!search && <button onClick={openCreate} className="btn-primary">Criar exercício</button>}
          />
        </div>
      ) : (
        <div data-tutorial="exercises-grid" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              isOwned={!!ex.trainerId}
              onEdit={openEdit}
              onDelete={handleDelete}
              onPlay={setVideo}
            />
          ))}
        </div>
      )}

      <ExerciseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        exercise={editExercise}
      />

      <VideoModal
        open={!!videoExercise}
        onClose={() => setVideo(null)}
        title={videoExercise?.name}
        videoUrl={videoExercise?.videoUrl}
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