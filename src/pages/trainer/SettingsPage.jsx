// src/pages/trainer/SettingsPage.jsx
import { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth }      from "@/lib/firebase";
import { useAuth }       from "@/contexts/AuthContext";
import AvatarUpload      from "@/components/ui/AvatarUpload";
import Modal             from "@/components/ui/Modal";
import toast             from "react-hot-toast";
import clsx              from "clsx";

// ── Planos ─────────────────────────────────────────────────────
const PLANS = [
  {
    id:       "free",
    name:     "Gratuito",
    price:    "R$ 0",
    period:   "",
    color:    "border-gray-200 bg-white",
    badge:    "badge-gray",
    features: ["Até 5 alunos", "Treinos limitados", "Avaliações básicas"],
    disabled: false,
  },
  {
    id:       "pro",
    name:     "Pro",
    price:    "R$ 89,90",
    period:   "/mês",
    color:    "border-brand-400 bg-brand-50",
    badge:    "badge-orange",
    features: ["Alunos ilimitados", "Vídeos nos exercícios", "Relatórios avançados", "Suporte prioritário"],
    popular:  true,
    disabled: true, // habilite ao integrar Stripe/Pagar.me
  },
  {
    id:       "premium",
    name:     "Premium",
    price:    "R$ 149,90",
    period:   "/mês",
    color:    "border-gray-200 bg-white",
    badge:    "badge-gold",
    features: ["Tudo do Pro", "White-label (sua marca)", "API de integração", "Gestor de equipe"],
    disabled: true,
  },
];

// ── Seção genérica ──────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="p-6 card">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Modal de reautenticação ────────────────────────────────────
function ReauthModal({ open, onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password) { toast.error("Digite sua senha atual."); return; }
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      onSuccess();
      onClose();
    } catch {
      toast.error("Senha incorreta.");
    } finally {
      setLoading(false);
      setPassword("");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirme sua senha" size="sm">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="mb-4 text-sm text-gray-500">
            Para alterar dados sensíveis, confirme sua senha atual.
          </p>
          <label className="label">Senha atual</label>
          <input type="password" autoFocus value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" className="input" disabled={loading} />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Verificando...</> : "Confirmar"}
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();

  // ── Profile form ───────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Security form ──────────────────────────────────────────
  const [newEmail, setNewEmail]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingSecurity, setSavingSecurity]   = useState(false);
  const [reauthOpen, setReauthOpen]   = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // "email" | "password"

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name:  profile.name  ?? "",
        phone: profile.phone ?? "",
        bio:   profile.bio   ?? "",
      });
      setNewEmail(profile.email ?? "");
    }
  }, [profile]);

  // ── Save profile ───────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim()) { toast.error("Nome é obrigatório."); return; }
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name:      profileForm.name.trim(),
        phone:     profileForm.phone.trim(),
        bio:       profileForm.bio.trim(),
        updatedAt: serverTimestamp(),
      });
      await refreshProfile(user.uid, user.email);
      toast.success("Perfil atualizado!");
    } catch { toast.error("Erro ao salvar perfil."); }
    finally { setSavingProfile(false); }
  }

  // ── Change email ───────────────────────────────────────────
  function handleEmailChange() {
    if (!newEmail || newEmail === profile?.email) return;
    setPendingAction("email");
    setReauthOpen(true);
  }

  async function executeEmailChange() {
    setSavingSecurity(true);
    try {
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, "users", user.uid), { email: newEmail, updatedAt: serverTimestamp() });
      await refreshProfile(user.uid, newEmail);
      toast.success("Email atualizado!");
    } catch (err) {
      toast.error(err.code === "auth/email-already-in-use" ? "Email já em uso." : "Erro ao atualizar email.");
    } finally { setSavingSecurity(false); }
  }

  // ── Change password ────────────────────────────────────────
  function handlePasswordChange() {
    if (!newPassword) { toast.error("Digite a nova senha."); return; }
    if (newPassword.length < 6) { toast.error("Mínimo 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { toast.error("Senhas não coincidem."); return; }
    setPendingAction("password");
    setReauthOpen(true);
  }

  async function executePasswordChange() {
    setSavingSecurity(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword(""); setConfirmPassword("");
      toast.success("Senha atualizada!");
    } catch { toast.error("Erro ao atualizar senha."); }
    finally { setSavingSecurity(false); }
  }

  function handleReauthSuccess() {
    if (pendingAction === "email")    executeEmailChange();
    if (pendingAction === "password") executePasswordChange();
    setPendingAction(null);
  }

  const currentPlan = profile?.plan ?? "free";

  return (
    <div className="flex flex-col max-w-2xl gap-6 mx-auto animate-fade-in">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gerencie seu perfil e sua conta</p>
      </div>

      {/* ── Foto e perfil ────────────────────────────────── */}
      <Section title="Perfil" description="Suas informações públicas visíveis para os alunos.">
        <div className="flex items-center gap-5 mb-6">
          <AvatarUpload
            name={profile?.name ?? ""}
            src={profile?.photoURL}
            userId={user?.uid}
            collection="users"
            docId={user?.uid}
            field="photoURL"
            size="xl"
            onUploaded={() => refreshProfile(user.uid, user.email)}
          />
          <div>
            <p className="text-sm font-medium text-gray-900">{profile?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Clique na foto para alterar</p>
            <p className="text-xs text-gray-400">JPG, PNG ou WebP · Máx. 5MB</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nome completo *</label>
              <input type="text" value={profileForm.name}
                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                className="input" placeholder="Seu nome" disabled={savingProfile} />
            </div>
            <div>
              <label className="label">WhatsApp / Telefone</label>
              <input type="tel" value={profileForm.phone}
                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                className="input" placeholder="(82) 99999-9999" disabled={savingProfile} />
            </div>
          </div>
          <div>
            <label className="label">Bio / Apresentação</label>
            <textarea rows={3} value={profileForm.bio}
              onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
              className="resize-none input"
              placeholder="Ex: Personal trainer com 5 anos de experiência, especialista em hipertrofia..."
              disabled={savingProfile} />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile
                ? <><span className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />Salvando...</>
                : "Salvar perfil"
              }
            </button>
          </div>
        </form>
      </Section>

      {/* ── Segurança ─────────────────────────────────────── */}
      <Section title="Segurança" description="Altere seu email ou senha de acesso.">
        <div className="flex flex-col gap-5">
          {/* Email */}
          <div>
            <label className="label">Email</label>
            <div className="flex gap-2">
              <input type="email" value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="flex-1 input" disabled={savingSecurity} />
              <button type="button" onClick={handleEmailChange}
                disabled={savingSecurity || newEmail === profile?.email}
                className="flex-shrink-0 btn-secondary disabled:opacity-40">
                Alterar
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nova senha</label>
              <input type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input" placeholder="Mínimo 6 caracteres" disabled={savingSecurity} />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input" placeholder="Repita a senha" disabled={savingSecurity} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handlePasswordChange}
              disabled={savingSecurity || !newPassword}
              className="btn-secondary disabled:opacity-40">
              {savingSecurity
                ? <><span className="w-4 h-4 border-2 border-gray-400 rounded-full border-t-transparent animate-spin" />Salvando...</>
                : "Alterar senha"
              }
            </button>
          </div>
        </div>
      </Section>

      {/* ── Plano de assinatura ───────────────────────────── */}
      <Section title="Plano de assinatura" description="Seu plano atual e opções disponíveis.">
        <div className="flex flex-col gap-3">
          {PLANS.map(plan => (
            <div key={plan.id}
              className={clsx(
                "rounded-2xl border-2 p-4 transition-all",
                currentPlan === plan.id ? "border-brand-400 bg-brand-50" : "border-gray-100 bg-white"
              )}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                  {plan.popular && (
                    <span className="text-[10px] font-semibold bg-brand-500 text-white px-2 py-0.5 rounded-full">Popular</span>
                  )}
                  {currentPlan === plan.id && (
                    <span className="badge-green text-[10px]">Plano atual</span>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-lg font-semibold text-gray-900">{plan.price}</span>
                  <span className="text-xs text-gray-400">{plan.period}</span>
                </div>
              </div>

              <ul className="flex flex-col gap-1 mb-4">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan !== plan.id && (
                <button
                  disabled={plan.disabled}
                  className={clsx(
                    "w-full py-2 rounded-xl text-sm font-medium transition-all",
                    plan.disabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-brand-500 text-white hover:bg-brand-600 active:scale-95"
                  )}
                  onClick={() => plan.disabled && toast("Em breve! Estamos integrando os pagamentos.", { icon: "🚀" })}
                >
                  {plan.disabled ? "Em breve" : `Assinar ${plan.name}`}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Zona de perigo ────────────────────────────────── */}
      <Section title="Zona de perigo">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Excluir conta</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Remove permanentemente sua conta e todos os dados. Esta ação não pode ser desfeita.
            </p>
          </div>
          <button
            onClick={() => toast.error("Para excluir sua conta, entre em contato com o suporte.")}
            className="flex-shrink-0 px-4 py-2 text-sm btn-danger"
          >
            Excluir conta
          </button>
        </div>
      </Section>

      <ReauthModal
        open={reauthOpen}
        onClose={() => { setReauthOpen(false); setPendingAction(null); }}
        onSuccess={handleReauthSuccess}
      />
    </div>
  );
}