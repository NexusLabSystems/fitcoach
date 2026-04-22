// src/pages/auth/InvitePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useInvite }  from "@/hooks/useInvite";
import { useAuth }    from "@/contexts/AuthContext";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db }   from "@/lib/firebase";
import toast    from "react-hot-toast";

export default function InvitePage() {
  const { token }    = useParams();
  const navigate     = useNavigate();
  const { getInvite, acceptInvite } = useInvite();
  const { registerStudent, login, user, profile, refreshProfile } = useAuth();

  const [invite, setInvite]   = useState(null);
  const [status, setStatus]   = useState("loading"); // loading | valid | invalid | expired | accepted
  const [mode, setMode]       = useState("register"); // register | login
  const [form, setForm]       = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [saving, setSaving]   = useState(false);

  // Carrega o convite
  useEffect(() => {
    getInvite(token).then(inv => {
      if (!inv)                       { setStatus("invalid");  return; }
      if (inv.status === "expired")   { setStatus("expired");  return; }
      if (inv.status === "accepted")  { setStatus("accepted"); return; }
      setInvite(inv);
      // Pré-preenche o nome e email do aluno se o trainer tiver cadastrado
      setForm(prev => ({
        ...prev,
        name:  inv.studentName  ?? "",
        email: inv.studentEmail ?? "",
      }));
      setStatus("valid");
    }).catch(() => setStatus("invalid"));
  }, [token]);

  // Se já está logado como aluno, aceita o convite direto
  useEffect(() => {
    if (user && profile?.role === "student" && invite && status === "valid") {
      handleLink(user.uid);
    }
  }, [user, profile, invite, status]);

  async function handleLink(uid) {
    try {
      await updateDoc(doc(db, "users", uid), {
        studentId: invite.studentId,
        updatedAt: serverTimestamp(),
      });
      await acceptInvite(invite.id, uid);
      await refreshProfile(uid);
      toast.success("Vinculado com sucesso! Bem-vindo(a) 🎉");
    } catch {
      toast.error("Erro ao vincular. Verifique com seu personal.");
    }
    navigate("/student", { replace: true });
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("Preencha todos os campos."); return; }
    if (form.password.length < 6)  { toast.error("Senha mínima: 6 caracteres."); return; }
    if (form.password !== form.confirmPassword) { toast.error("Senhas não coincidem."); return; }

    setSaving(true);
    try {
      const cred = await registerStudent({ name: form.name, email: form.email, password: form.password });
      await handleLink(cred.user.uid);
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Este email já tem conta. Clique em \"Já tenho conta\".",
        "auth/weak-password":        "Senha muito fraca.",
      };
      toast.error(msgs[err.code] ?? "Erro ao criar conta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Preencha email e senha."); return; }
    setSaving(true);
    try {
      const cred = await login(form.email, form.password);
      await handleLink(cred.user.uid);
    } catch (err) {
      const msgs = {
        "auth/invalid-credential": "Email ou senha incorretos.",
      };
      toast.error(msgs[err.code] ?? "Erro ao entrar.");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // ── Estados de carregamento / erro ─────────────────────────
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full border-brand-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return <InviteMessage emoji="❌" title="Convite inválido" desc="Este link não existe ou foi removido." />;
  }

  if (status === "expired") {
    return <InviteMessage emoji="⏰" title="Convite expirado" desc="Este link era válido por 7 dias e já expirou. Peça um novo convite ao seu personal." />;
  }

  if (status === "accepted") {
    return <InviteMessage emoji="✅" title="Convite já utilizado" desc="Este link já foi aceito. Faça login normalmente." action={<Link to="/login" className="btn-primary">Fazer login</Link>} />;
  }

  // ── Formulário de aceite ───────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-brand-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Você foi convidado!</h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-brand-500">{invite?.trainerName}</span> está te esperando no Pump Fit
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 mb-6 bg-gray-100 rounded-xl">
          {[
            { value: "register", label: "Criar conta" },
            { value: "login",    label: "Já tenho conta" },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => setMode(opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <div className="p-6 card">
          {mode === "register" ? (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="label">Nome completo</label>
                <input name="name" type="text" placeholder="Seu nome"
                  value={form.name} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" placeholder="seu@email.com"
                  value={form.email} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <div>
                <label className="label">Senha</label>
                <input name="password" type="password" placeholder="Mínimo 6 caracteres"
                  value={form.password} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <div>
                <label className="label">Confirmar senha</label>
                <input name="confirmPassword" type="password" placeholder="Repita a senha"
                  value={form.confirmPassword} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 mt-1">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Criando conta...</>
                  : "Criar conta e aceitar convite"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" placeholder="seu@email.com"
                  value={form.email} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <div>
                <label className="label">Senha</label>
                <input name="password" type="password" placeholder="••••••••"
                  value={form.password} onChange={handleChange} className="input" disabled={saving} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 mt-1">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Entrando...</>
                  : "Entrar e aceitar convite"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-xs text-center text-gray-400">
          Este convite é válido por 7 dias · Pump Fit
        </p>
      </div>
    </div>
  );
}

function InviteMessage({ emoji, title, desc, action }) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
      <div className="max-w-xs text-center">
        <p className="mb-4 text-5xl">{emoji}</p>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{title}</h1>
        <p className="mb-6 text-sm text-gray-400">{desc}</p>
        {action}
      </div>
    </div>
  );
}