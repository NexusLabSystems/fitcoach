// src/components/ui/VideoModal.jsx
import { useState } from "react";
import Modal from "@/components/ui/Modal";

// Extrai o ID do YouTube de qualquer formato de URL
export function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function youtubeThumbnail(url) {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function youtubeWatchUrl(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : url;
}

export function youtubeEmbedUrl(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}

export default function VideoModal({ open, onClose, title, videoUrl }) {
  const [embedFailed, setEmbedFailed] = useState(false);
  const embedUrl  = youtubeEmbedUrl(videoUrl);
  const watchUrl  = youtubeWatchUrl(videoUrl);

  function handleClose() {
    setEmbedFailed(false);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title ?? "Demonstração"}>
      <Modal.Body className="p-0">
        {!embedFailed && embedUrl ? (
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-b-2xl"
              onError={() => setEmbedFailed(true)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.45A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 001.95-1.97A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#ef4444" stroke="none"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Incorporação não permitida</p>
            <p className="text-xs text-gray-400 mb-5">O dono do vídeo desabilitou a reprodução incorporada.</p>
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
              Assistir no YouTube
            </a>
          </div>
        )}

        {/* Sempre mostra o link como fallback quando o embed carrega */}
        {!embedFailed && embedUrl && (
          <div className="flex justify-center py-3 border-t border-gray-100">
            <a
              href={watchUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-400 hover:text-brand-500 transition-colors flex items-center gap-1"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
              Abrir no YouTube
            </a>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
