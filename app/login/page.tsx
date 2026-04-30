"use client";

import { useState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
