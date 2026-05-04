import type { Metadata } from "next";
import { LancamentoPage } from "@/components/lancamento/lancamento-page";

type SearchParams = {
  ref?: string | string[];
};

export const metadata: Metadata = {
  title: "Lançamento Missão ÉLuta | Pré-campanha Alexandre VR Abandonada",
  description:
    "Evento de lançamento da pré-campanha e do app Missão ÉLuta — Escutar, Cuidar e Organizar.",
  alternates: {
    canonical: "/lancamento"
  },
  openGraph: {
    title: "Lançamento Missão ÉLuta | Pré-campanha Alexandre VR Abandonada",
    description:
      "Evento de lançamento da pré-campanha e do app Missão ÉLuta — Escutar, Cuidar e Organizar.",
    type: "website",
    url: "/lancamento"
  },
  twitter: {
    card: "summary",
    title: "Lançamento Missão ÉLuta | Pré-campanha Alexandre VR Abandonada",
    description:
      "Evento de lançamento da pré-campanha e do app Missão ÉLuta — Escutar, Cuidar e Organizar."
  }
};

export default function LancamentoRoute({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const refCode = typeof searchParams?.ref === "string" ? searchParams.ref : undefined;

  return <LancamentoPage refCode={refCode} />;
}
