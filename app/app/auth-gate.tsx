"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Check, LogIn, LogOut, Mail, Route, UserPlus } from "lucide-react";
import Dashboard from "./dashboard";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true); setMessage("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setMessage(error?.message ?? (data.session ? "Conta criada. Você já está conectado." : "Conta criada. Confirme o e-mail para entrar."));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message);
    }
    setSubmitting(false);
  }

  if (!isSupabaseConfigured) return <main className="auth-shell"><section className="auth-card"><div className="auth-logo"><Route size={24}/></div><h1>Falta conectar o Supabase</h1><p>Adicione as duas variáveis do arquivo <code>.env.example</code> na Vercel para liberar o login.</p></section></main>;
  if (loading) return <main className="auth-shell"><section className="auth-card"><div className="auth-spinner"/><p>Carregando seu GPS...</p></section></main>;
  if (session) return <><Dashboard ownerId={session.user.id} /><button className="cloud-logout" onClick={() => supabase?.auth.signOut()}><LogOut size={15}/> Sair</button></>;

  return <main className="auth-shell">
    <section className="auth-card auth-form-card">
      <div className="auth-brand"><div className="auth-logo"><Route size={24}/></div><div><strong>GPS</strong><span>da Aprovação</span></div></div>
      <span className="auth-kicker">SEU ESTUDO, SINCRONIZADO</span>
      <h1>{mode === "login" ? "Entre para continuar sua rota" : "Crie seu acesso"}</h1>
      <p>Seus perfis, agenda, questões e revisões ficam protegidos e disponíveis em qualquer dispositivo.</p>
      <form onSubmit={submit}>
        <label><span><Mail size={15}/> E-mail</span><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></label>
        <label><span><Check size={15}/> Senha</span><input type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" /></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="auth-submit" disabled={submitting}>{mode === "login" ? <LogIn size={17}/> : <UserPlus size={17}/>} {submitting ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>{mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button>
    </section>
  </main>;
}
