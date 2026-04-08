// src/pages/auth/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) { toast.error("Digite seu email."); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      toast.error("Erro ao enviar email. Verifique o endereço.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Voltar ao login
        </Link>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h2>
              <p className="text-sm text-gray-500">
                Verifique sua caixa de entrada em <strong>{email}</strong> e siga as instruções para redefinir sua senha.
              </p>
              <Link to="/login" className="btn-primary w-full mt-6 py-2.5">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Redefinir senha</h1>
              <p className="text-sm text-gray-500 mb-6">Enviaremos um link para o seu email.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email" type="email" autoComplete="email"
                    placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="input" disabled={loading}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando...</>
                  ) : "Enviar link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}