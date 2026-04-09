// src/components/students/EvolutionPhotos.jsx
// Galeria de fotos de evolução vinculada a um aluno.
// Usado dentro de StudentDetailPage (aba Avaliações).
import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db }          from "@/lib/firebase";
import { useAuth }     from "@/contexts/AuthContext";
import { useUpload }   from "@/hooks/useUpload";
import toast           from "react-hot-toast";
import { format }      from "date-fns";
import { ptBR }        from "date-fns/locale";
import clsx            from "clsx";

const CATEGORIES = ["Frontal", "Lateral", "Costas", "Outro"];

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

// ── Photo lightbox ─────────────────────────────────────────────
function Lightbox({ photo, onClose, onDelete }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
    >
      <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.category}
          className="w-full rounded-2xl object-contain max-h-[75vh]"
        />
        <div className="flex items-center justify-between px-1 mt-3">
          <div>
            <p className="text-sm font-medium text-white">{photo.category}</p>
            <p className="text-xs text-gray-400">{formatDate(photo.createdAt)}</p>
          </div>
          <button
            onClick={() => onDelete(photo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 text-xs font-medium transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
            Excluir
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute flex items-center justify-center w-8 h-8 text-white transition-colors rounded-full -top-3 -right-3 bg-white/10 hover:bg-white/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function EvolutionPhotos({ studentId }) {
  const { user }   = useAuth();
  const { uploadEvolutionPhoto, deleteFile, uploading, progress } = useUpload();
  const inputRef   = useRef(null);

  const [photos, setPhotos]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lightbox, setLightbox]   = useState(null);
  const [category, setCategory]   = useState("Frontal");
  const [filterCat, setFilterCat] = useState("Todas");

  // Escuta fotos em tempo real
  useEffect(() => {
    if (!studentId) return;
    const q = query(
      collection(db, "evolutionPhotos"),
      where("studentId", "==", studentId)
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setPhotos(data);
      setLoading(false);
    });
    return unsub;
  }, [studentId]);

  async function handleFiles(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const url = await uploadEvolutionPhoto(file, studentId);
        await addDoc(collection(db, "evolutionPhotos"), {
          studentId,
          trainerId:  user.uid,
          url,
          category,
          createdAt:  serverTimestamp(),
        });
      } catch (err) {
        toast.error(err.message ?? "Erro ao enviar foto.");
        break;
      }
    }
    toast.success(files.length > 1 ? `${files.length} fotos adicionadas!` : "Foto adicionada!");
    e.target.value = "";
  }

  async function handleDelete(photo) {
    if (!window.confirm("Excluir esta foto?")) return;
    try {
      await deleteFile(photo.url);
      await deleteDoc(doc(db, "evolutionPhotos", photo.id));
      setLightbox(null);
      toast.success("Foto excluída.");
    } catch {
      toast.error("Erro ao excluir.");
    }
  }

  const filtered = filterCat === "Todas"
    ? photos
    : photos.filter(p => p.category === filterCat);

  // Agrupa por data (mês/ano)
  const groups = filtered.reduce((acc, photo) => {
    const key = photo.createdAt
      ? format(photo.createdAt.toDate ? photo.createdAt.toDate() : new Date(photo.createdAt), "MMMM yyyy", { locale: ptBR })
      : "Sem data";
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          {["Todas", ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={clsx(
                "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filterCat === cat
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Upload controls */}
        <div className="flex items-center flex-shrink-0 gap-2">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input py-1.5 text-xs w-28"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-xs px-3 py-1.5"
          >
            {uploading ? (
              <><span className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin" />{progress}%</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>Adicionar foto</>
            )}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={uploading}
      />

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 rounded-full bg-brand-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Photo grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 aspect-square rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="p-10 text-center transition-all border-2 border-gray-200 border-dashed cursor-pointer rounded-2xl hover:border-brand-300 hover:bg-orange-50"
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex items-center justify-center w-10 h-10 mx-auto mb-3 bg-gray-100 rounded-xl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <p className="text-sm text-gray-400">Nenhuma foto ainda</p>
          <p className="mt-1 text-xs text-gray-300">Clique para adicionar fotos de evolução</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groups).map(([month, groupPhotos]) => (
            <div key={month}>
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase capitalize">
                {month}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {groupPhotos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative overflow-hidden bg-gray-100 cursor-pointer aspect-square rounded-xl group"
                    onClick={() => setLightbox(photo)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.category}
                      className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 transition-colors bg-black/0 group-hover:bg-black/20" />
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                      {photo.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <Lightbox
          photo={lightbox}
          onClose={() => setLightbox(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}