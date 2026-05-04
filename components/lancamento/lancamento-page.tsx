"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  refCode?: string;
};

const baseCopy = "Lançamento Missão ÉLuta: encontro para escutar, cuidar e organizar o território com responsabilidade coletiva.";

export function LancamentoPage({ refCode }: Props) {
  const [origin, setOrigin] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const refSuffix = useMemo(() => (refCode ? `?ref=${encodeURIComponent(refCode)}` : ""), [refCode]);
  const landingPath = useMemo(() => `/lancamento${refSuffix}`, [refSuffix]);
  const authPath = useMemo(() => `/auth${refSuffix}`, [refSuffix]);
  const landingUrl = useMemo(() => (origin ? `${origin}${landingPath}` : landingPath), [landingPath, origin]);

  const shareMessage = useMemo(() => {
    const refText = refCode ? ` Referência: ${refCode}.` : "";
    return `${baseCopy}${refText} Saiba mais em: ${landingUrl}`;
  }, [landingUrl, refCode]);

  const whatsappHref = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
    [shareMessage]
  );

  async function copyText(text: string, successLabel: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(successLabel);
    } catch {
      setFeedback("Não foi possível copiar. Tente manualmente.");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section
        aria-labelledby="lancamento-title"
        className="rounded-[1.75rem] border border-semear-green/20 bg-white/90 p-6 shadow-soft sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-semear-earth">Pré-campanha</p>
        <h1 id="lancamento-title" className="mt-3 text-3xl font-semibold leading-tight text-semear-green sm:text-4xl">
          Lançamento Missão ÉLuta
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-800 sm:text-lg">
          Evento de apresentação pública do app Missão ÉLuta, com foco em escuta cidadã,
          cuidado coletivo e organização territorial.
        </p>

        <div className="mt-6 rounded-2xl border border-semear-green/20 bg-semear-green-soft/50 p-4">
          <h2 className="text-lg font-semibold text-semear-green">Mensagem-base para compartilhamento</h2>
          <p className="mt-2 break-words text-sm leading-relaxed text-stone-800">{shareMessage}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-label="Copiar mensagem de compartilhamento"
            onClick={() => void copyText(shareMessage, "Mensagem copiada com sucesso.")}
            className="min-h-11 rounded-full border border-semear-green bg-white px-5 text-sm font-semibold text-semear-green transition hover:bg-semear-green-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green motion-reduce:transition-none"
          >
            Copiar mensagem
          </button>
          <button
            type="button"
            aria-label="Copiar link da página de lançamento"
            onClick={() => void copyText(landingUrl, "Link copiado com sucesso.")}
            className="min-h-11 rounded-full border border-semear-green bg-white px-5 text-sm font-semibold text-semear-green transition hover:bg-semear-green-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green motion-reduce:transition-none"
          >
            Copiar link
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            aria-label="Compartilhar mensagem no WhatsApp"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-semear-green px-5 text-sm font-semibold text-white transition hover:bg-semear-green/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green motion-reduce:transition-none"
          >
            Compartilhar no WhatsApp
          </a>
          <Link
            href={authPath}
            aria-label="Acessar autenticação"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-semear-green px-5 text-sm font-semibold text-semear-green transition hover:bg-semear-green-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-semear-green motion-reduce:transition-none"
          >
            Entrar no app
          </Link>
        </div>

        <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-semear-green">
          {feedback}
        </p>
      </section>

      <section
        aria-labelledby="seguranca-title"
        className="mt-6 rounded-[1.5rem] border border-semear-green/15 bg-white/85 p-6 shadow-soft"
      >
        <h2 id="seguranca-title" className="text-xl font-semibold text-semear-green">
          Diretriz de comunicação
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-800 sm:text-base">
          Este conteúdo apresenta um evento de pré-campanha com linguagem institucional de participação
          cidadã. Não há pedido de apoio individual, promessa de benefício pessoal ou conteúdo de ataque.
        </p>
      </section>
    </main>
  );
}
