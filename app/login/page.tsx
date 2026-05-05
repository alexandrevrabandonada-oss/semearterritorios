"use client";

import { useEffect, useState } from "react";
import { login } from "./actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(params.get("error"));
  }, []);

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setOauthError(null);

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setOauthError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      setGoogleLoading(false);
      return;
    }

    const origin = window.location.origin;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/`
      }
    });

    if (signInError) {
      setOauthError("Nao foi possivel iniciar o login com Google.");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/72 p-8 shadow-soft">
        <h1 className="text-3xl font-semibold tracking-tight text-semear-green text-center mb-6">
          Semear Territórios
        </h1>
        {(authError === "oauth" || oauthError) && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {oauthError ?? "Nao foi possivel concluir o login com Google. Tente novamente."}
          </div>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="mb-4 w-full min-h-11 rounded-full border border-semear-green/25 bg-white px-4 text-sm font-semibold text-semear-green transition hover:border-semear-green/40 hover:bg-semear-offwhite disabled:opacity-50"
        >
          {googleLoading ? "Redirecionando..." : "Entrar com Google"}
        </button>
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-stone-400">
          <span className="h-px flex-1 bg-semear-gray" />
          <span>ou</span>
          <span className="h-px flex-1 bg-semear-gray" />
        </div>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-2 min-h-11 w-full rounded-2xl border border-semear-gray bg-white px-4 text-sm outline-none focus:border-semear-green"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 rounded-full bg-semear-green px-4 text-sm font-semibold text-white transition hover:bg-semear-green/90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
