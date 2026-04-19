// src/pages/student/StudentProfile.jsx
import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import { useAuth }             from "@/contexts/AuthContext";
import { useStudentWorkout }   from "@/hooks/useStudentWorkout";
import AvatarUpload            from "@/components/ui/AvatarUpload";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db }   from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR }   from "date-fns/locale";
import toast      from "react-hot-toast";
import clsx       from "clsx";

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { profile, logout } = useAuth();
  const { plan }            = useStudentWorkout();
  const navigate            = useNavigate();
  const [stats, setStats]   = useState({ total: 0, streak: 0, bestStreak: 0 });

  useEffect(() => {
    if (!profile?.uid) return;
    getDocs(query(collection(db, "workoutLogs"), where("studentId", "==", profile.uid)))
      .then(snap => {
        const logs = snap.docs.map(d => d.data());
        const total = logs.length;

        const daySet = new Set(logs.map(l => {
          const d = l.date?.toDate ? l.date.toDate() : new Date(l.date ?? 0);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }));

        const today = new Date(); today.setHours(0, 0, 0, 0);
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const day = new Date(today); day.setDate(today.getDate() - i);
          if (daySet.has(day.getTime())) streak++;
          else if (i > 0) break;
        }

        const sorted = [...daySet].sort((a, b) => a - b);
        let bestStreak = sorted.length > 0 ? 1 : 0, cur = 1;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] - sorted[i - 1] === 86400000) { cur++; bestStreak = Math.max(bestStreak, cur); }
          else cur = 1;
        }

        setStats({ total, streak, bestStreak });
      })
      .catch(() => {});
  }, [profile?.uid]);

  async function handleLogout() {
    await logout();
    toast.success("Até logo!");
    navigate("/login", { replace: true });
  }

  const memberSince = profile?.createdAt
    ? format(profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt), "MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="min-h-screen pb-10">

      {/* Banner + Avatar */}
      <div className="relative bg-gradient-to-br from-brand-500 to-brand-700 h-32">
        <div className="absolute -bottom-12 left-5">
          <div className="ring-4 ring-white rounded-full">
            <AvatarUpload
              name={profile?.name ?? ""}
              src={profile?.photoURL}
              userId={profile?.uid}
              collection="users"
              docId={profile?.uid}
              field="photoURL"
              size="xl"
            />
          </div>
        </div>
      </div>

      {/* Nome e badge */}
      <div className="pt-14 px-5 pb-4 bg-white border-b border-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile?.name}</h1>
            {memberSince && (
              <p className="text-xs text-gray-400 mt-0.5">Membro desde {memberSince}</p>
            )}
          </div>
          <span className="badge-green text-xs mb-1">Aluno ativo</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-5 pt-5">
        {[
          { label: "Treinos",          value: stats.total,      icon: "💪" },
          { label: "Sequência atual",  value: stats.streak,     icon: "🔥" },
          { label: "Melhor sequência", value: stats.bestStreak, icon: "⭐" },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-lg mb-0.5">{s.icon}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plano ativo */}
      {plan && (
        <div className="px-5 pt-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Plano atual</p>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3E564F" strokeWidth="2" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{plan.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {plan.days?.filter(d => d.exercises?.length > 0).length ?? 0} dias de treino
              </p>
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Ativo</span>
          </div>
        </div>
      )}

      {/* Informações pessoais */}
      <div className="px-5 pt-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Informações</p>
        <div className="card px-4">
          <InfoRow
            label="E-mail"
            value={profile?.email}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          />
          <InfoRow
            label="Telefone"
            value={profile?.phone}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>}
          />
          <InfoRow
            label="Objetivo"
            value={profile?.goal}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
          />
          <InfoRow
            label="Data de nascimento"
            value={profile?.birthDate
              ? format(profile.birthDate.toDate ? profile.birthDate.toDate() : new Date(profile.birthDate), "dd/MM/yyyy")
              : null}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          />
        </div>
      </div>

      {/* Conta */}
      <div className="px-5 pt-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Conta</p>
        <div className="card overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4 text-red-500 hover:bg-red-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Sair da conta</span>
          </button>
        </div>
      </div>

    </div>
  );
}
