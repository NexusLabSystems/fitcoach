// src/hooks/useUpload.js
import { useState, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

export function useUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // ── Upload genérico com progresso ──────────────────────────
  const upload = useCallback((file, path) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      setUploading(true);
      setProgress(0);

      task.on(
        "state_changed",
        (snap) => {
          setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        },
        (err) => {
          setUploading(false);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploading(false);
          setProgress(0);
          resolve(url);
        }
      );
    });
  }, []);

  // ── Upload de foto de perfil ───────────────────────────────
  const uploadAvatar = useCallback(async (file, userId) => {
    validateImage(file);
    const ext  = file.name.split(".").pop();
    const path = `avatars/${userId}/profile.${ext}`;
    return upload(file, path);
  }, [upload]);

  // ── Upload de foto de evolução ─────────────────────────────
  const uploadEvolutionPhoto = useCallback(async (file, studentId) => {
    validateImage(file);
    const ext  = file.name.split(".").pop();
    const ts   = Date.now();
    const path = `evolution/${studentId}/${ts}.${ext}`;
    return upload(file, path);
  }, [upload]);

  // ── Deletar arquivo ────────────────────────────────────────
  const deleteFile = useCallback(async (url) => {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch {
      // Ignora se arquivo já não existe
    }
  }, []);

  return { upload, uploadAvatar, uploadEvolutionPhoto, deleteFile, uploading, progress };
}

// ── Validação ──────────────────────────────────────────────────
function validateImage(file) {
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  const MAX_MB  = 5;
  if (!ALLOWED.includes(file.type)) throw new Error("Formato inválido. Use JPG, PNG ou WebP.");
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`Imagem muito grande. Máximo ${MAX_MB}MB.`);
}