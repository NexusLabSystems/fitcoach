// src/pages/student/StudentProfile.jsx
import { useNavigate }   from "react-router-dom";
import { useAuth }       from "@/contexts/AuthContext";
import Avatar            from "@/components/ui/Avatar";
import toast             from "react-hot-toast";

export default function StudentProfile() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success("Até logo!");
    navigate("/login", { replace: true });
  }

  const rows = [
    { label: "Email",    value: profile?.email },
    { label: "Telefone", value: profile?.phone },
    { label: "Objetivo", value: profile?.goal },
  ].filter(r => r.value);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.name ?? ""} size="xl" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{profile?.name}</h1>
            <span className="badge-green mt-1">Aluno ativo</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {rows.length > 0 && (
          <div className="card p-4 divide-y divide-gray-50">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-400">{r.label}</span>
                <span className="text-sm text-gray-900">{r.value}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn-ghost w-full py-3 text-red-500 hover:bg-red-50 border border-red-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair
        </button>
      </div>
    </div>
  );
}