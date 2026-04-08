// src/pages/auth/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { registerTrainer, registerStudent } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ?role=student para registro de aluno
  const defaultRole = searchParams.get("role") === "student" ? "student" : "trainer";
  const [role, setRole] = useState(defaultRole);

  const [form, setForm]       = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error("Preencha todos os campos."); return;
    }
    if (form.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres."); return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem."); return;
    }
    setLoading(true);
    try {
      if (role === "student") {
        await registerStudent({ name: form.name, email: form.email, password: form.password });
        toast.success("Conta criada! Bem-vindo(a)!");
        navigate("/student", { replace: true });
      } else {
        await registerTrainer({ name: form.name, email: form.email, password: form.password });
        toast.success("Conta criada com sucesso!");
        navigate("/trainer", { replace: true });
      }
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Este email já está cadastrado.",
        "auth/invalid-email":        "Email inválido.",
        "auth/weak-password":        "Senha muito fraca.",
      };
      toast.error(msgs[err.code] ?? "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-brand-500 items-center justify-center mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 4v16M18 4v16M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1>
        </div>

        {/* Role selector */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          {[
            { value: "trainer", label: "Sou Personal Trainer" },
            { value: "student", label: "Sou Aluno(a)" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                role === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {role === "student" && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-blue-700">
              Use o <strong>mesmo email</strong> que seu personal cadastrou para você. Assim o treino aparece automaticamente.
            </p>
          </div>
        )}

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="name">Nome completo</label>
              <input id="name" name="name" type="text" placeholder="João Silva"
                value={form.name} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" placeholder="seu@email.com"
                value={form.email} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres"
                value={form.password} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirmar senha</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha"
                value={form.confirmPassword} onChange={handleChange} className="input" disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Criando...</>
                : "Criar conta grátis"
              }
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-brand-500 font-medium hover:text-brand-600 transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}