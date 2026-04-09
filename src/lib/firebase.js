// src/lib/firebase.js
// ─────────────────────────────────────────────────────────────
// Preencha as variáveis no seu arquivo .env.local
// (nunca commite o .env.local no Git!)
// ─────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getAuth }        from "firebase/auth";
import { enableIndexedDbPersistence } from "firebase/firestore";
import { getFirestore }   from "firebase/firestore";
import { getStorage }     from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Valida que todas as variáveis estão preenchidas em dev
if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    console.warn(
      `⚠️  Firebase: variáveis de ambiente faltando:\n  ${missing.join("\n  ")}\n\n` +
      `  Copie o arquivo .env.example para .env.local e preencha os valores.`
    );
  }
}

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Ativa persistência offline do Firestore
// Permite que dados já carregados fiquem disponíveis sem internet
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    // Múltiplas abas abertas — persistência só funciona em uma aba por vez
    console.warn("Firestore offline: múltiplas abas detectadas.");
  } else if (err.code === "unimplemented") {
    // Navegador não suporta
    console.warn("Firestore offline: navegador não suportado.");
  }
});

export default app;