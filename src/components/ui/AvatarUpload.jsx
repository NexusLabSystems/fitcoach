// src/components/ui/AvatarUpload.jsx
import { useRef, useState } from "react";
import { useUpload }  from "@/hooks/useUpload";
import { doc, updateDoc } from "firebase/firestore";
import { db }   from "@/lib/firebase";
import toast    from "react-hot-toast";
import clsx     from "clsx";

// Componente reutilizável para qualquer tipo de avatar com upload
// Props:
//   name       — texto para iniciais (fallback)
//   src        — URL atual da foto
//   userId     — uid do Firebase Auth (para salvar no doc users/)
//   collection — coleção Firestore a atualizar ("users" | "students")
//   docId      — ID do documento a atualizar
//   field      — campo a atualizar (padrão: "photoURL")
//   size       — "md" | "lg" | "xl"
//   onUploaded — callback(url) após upload
export default function AvatarUpload({
  name = "",
  src,
  userId,
  collection: col = "users",
  docId,
  field = "photoURL",
  size  = "xl",
  onUploaded,
}) {
  const inputRef = useRef(null);
  const { uploadAvatar, uploading, progress } = useUpload();
  const [preview, setPreview] = useState(src ?? null);

  const SIZES = {
    md: "w-9  h-9  text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  function initials(n) {
    return n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview imediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const url = await uploadAvatar(file, userId);

      // Atualiza Firestore
      if (docId) {
        await updateDoc(doc(db, col, docId), { [field]: url });
      }

      setPreview(url);
      onUploaded?.(url);
      toast.success("Foto atualizada!");
    } catch (err) {
      setPreview(src ?? null);
      toast.error(err.message ?? "Erro ao enviar foto.");
    } finally {
      // Libera o object URL
      URL.revokeObjectURL(objectUrl);
      e.target.value = "";
    }
  }

  return (
    <div className="relative cursor-pointer group" onClick={() => inputRef.current?.click()}>
      {/* Avatar */}
      <div className={clsx(
        "rounded-full overflow-hidden flex items-center justify-center font-semibold flex-shrink-0 bg-brand-100 text-brand-700",
        SIZES[size]
      )}>
        {preview ? (
          <img src={preview} alt={name} className="object-cover w-full h-full" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>

      {/* Upload overlay */}
      <div className={clsx(
        "absolute inset-0 rounded-full flex items-center justify-center transition-opacity",
        uploading ? "bg-black/50 opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100"
      )}>
        {uploading ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-white">{progress}%</span>
          </div>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        )}
      </div>

      {/* Câmera badge */}
      {!uploading && (
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
    </div>
  );
}