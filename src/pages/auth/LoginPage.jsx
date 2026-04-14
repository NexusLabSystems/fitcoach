// src/pages/auth/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname ?? "/trainer";

  const [form, setForm]       = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(null); // "ios" | "android" | null

  const isInstalled = window.matchMedia("(display-mode: standalone)").matches
                   || !!window.navigator.standalone;
  const isIos     = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMobile  = isIos || isAndroid;
  const showInstallBtn = !isInstalled && isMobile;

  async function handleInstall() {
    if (isAndroid && window.__pwaPrompt) {
      window.__pwaPrompt.prompt();
      const { outcome } = await window.__pwaPrompt.userChoice;
      if (outcome === "accepted") window.__pwaPrompt = null;
      return;
    }
    setShowGuide(isIos ? "ios" : "android");
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Preencha email e senha.");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      const msgs = {
        "auth/invalid-credential":   "Email ou senha incorretos.",
        "auth/too-many-requests":    "Muitas tentativas. Tente mais tarde.",
        "auth/user-disabled":        "Conta desativada.",
      };
      toast.error(msgs[err.code] ?? "Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Esquerda: banner ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">FitCoach</span>
        </div>

        <div>
          <p className="text-4xl font-semibold text-white leading-tight mb-4">
            Gerencie seus alunos.<br/>
            <span className="text-brand-400">Amplie seus resultados.</span>
          </p>
          <p className="text-gray-400 text-base leading-relaxed">
            Treinos personalizados, avaliações e pagamentos em uma única plataforma.
          </p>
        </div>

        <div className="flex gap-6">
          {[["500+", "Personal trainers"], ["12k+", "Alunos ativos"], ["98%", "Satisfação"]].map(([num, label]) => (
            <div key={label}>
              <p className="text-2xl font-semibold text-white">{num}</p>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Direita: formulário ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900">FitCoach</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-sm text-gray-500 mb-8">Entre na sua conta</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                placeholder="seu@email.com"
                value={form.email} onChange={handleChange}
                className="input"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label" htmlFor="password">Senha</label>
                <Link to="/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 transition-colors">
                  Esqueci a senha
                </Link>
              </div>
              <input
                id="password" name="password" type="password" autoComplete="current-password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange}
                className="input"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{" "}
            <Link to="/register" className="text-brand-500 font-medium hover:text-brand-600 transition-colors">
              Criar conta grátis
            </Link>
          </p>

          {showInstallBtn && (
            <button
              onClick={handleInstall}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v13M8 11l4 4 4-4"/>
                <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"/>
              </svg>
              Baixar APP
            </button>
          )}

          {showGuide && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
              onClick={() => setShowGuide(null)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                {showGuide === "ios" ? (
                  <>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Instalar no iPhone / iPad</h3>
                    <p className="text-sm text-gray-500 mb-4">Siga os passos abaixo no Safari:</p>
                    <ol className="flex flex-col gap-3 text-sm text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span>Toque no botão <strong>Compartilhar</strong>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2" strokeLinecap="round" className="inline ml-1 mb-0.5">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                          </svg>
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span>Role e toque em <strong>Adicionar à Tela de Início</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span>Toque em <strong>Adicionar</strong> no canto superior direito</span>
                      </li>
                    </ol>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Instalar no Android</h3>
                    <p className="text-sm text-gray-500 mb-4">Siga os passos abaixo no Chrome:</p>
                    <ol className="flex flex-col gap-3 text-sm text-gray-700">
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span>Toque nos <strong>3 pontinhos</strong> (⋮) no canto superior direito</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span>Toque em <strong>Adicionar à tela inicial</strong></span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span>Confirme tocando em <strong>Adicionar</strong></span>
                      </li>
                    </ol>
                  </>
                )}
                <button onClick={() => setShowGuide(null)}
                  className="mt-5 w-full py-2.5 btn-primary">Entendi</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
