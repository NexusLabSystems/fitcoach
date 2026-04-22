// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc, getDoc, setDoc, getDocs,
  collection, query, where, updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await refreshProfile(firebaseUser.uid, firebaseUser.email);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return () => { try { unsub(); } catch {} };
  }, []);

  async function refreshProfile(uid, email) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;

    let data = snap.data();

    if (data.role === "student") {
      // Se ainda não tiver studentId, busca pelo email e faz a ligação automática
      if (!data.studentId && email) {
        const studentSnap = await getDocs(
          query(collection(db, "students"), where("email", "==", email))
        );
        if (!studentSnap.empty) {
          const studentDoc = studentSnap.docs[0];
          await updateDoc(doc(db, "users", uid), {
            studentId: studentDoc.id,
            phone:     studentDoc.data().phone     ?? data.phone     ?? null,
            goal:      studentDoc.data().goal      ?? data.goal      ?? null,
            birthDate: studentDoc.data().birthDate ?? data.birthDate ?? null,
          });
          data = {
            ...data,
            studentId:     studentDoc.id,
            studentStatus: studentDoc.data().status ?? "active",
          };
        }
      } else if (data.studentId) {
        // Busca o status atual do aluno (para bloquear se arquivado)
        const studentSnap = await getDoc(doc(db, "students", data.studentId));
        if (studentSnap.exists()) {
          data = { ...data, studentStatus: studentSnap.data().status ?? "active" };
        }
      }
    }

    setProfile(data);
    return data;
  }

  // ── Registrar trainer ──────────────────────────────────────
  async function registerTrainer({ name, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid:       cred.user.uid,
      name,
      email,
      role:      "trainer",
      plan:      "free",
      createdAt: serverTimestamp(),
    });
    await refreshProfile(cred.user.uid, email);
    return cred;
  }

  // ── Registrar aluno ────────────────────────────────────────
  // Cria o users doc primeiro (necessário para as regras Firestore),
  // depois busca o doc em `students` pelo email e atualiza o studentId.
  async function registerStudent({ name, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // 1. Cria o users doc imediatamente (sem studentId por enquanto)
    await setDoc(doc(db, "users", cred.user.uid), {
      uid:       cred.user.uid,
      name,
      email,
      role:      "student",
      studentId: null,
      createdAt: serverTimestamp(),
    });

    // 2. Agora que o users doc existe, busca o doc de students pelo email
    const studentSnap = await getDocs(
      query(collection(db, "students"), where("email", "==", email))
    );
    if (!studentSnap.empty) {
      await updateDoc(doc(db, "users", cred.user.uid), {
        studentId: studentSnap.docs[0].id,
      });
    }

    await refreshProfile(cred.user.uid, email);
    return cred;
  }

  // ── Login ──────────────────────────────────────────────────
  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const data = await refreshProfile(cred.user.uid, cred.user.email);
    return { ...cred, profileRole: data?.role ?? null };
  }

  async function logout() { await signOut(auth); }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading,
      login, logout,
      registerTrainer, registerStudent,
      resetPassword, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}