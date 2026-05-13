import type { Metadata } from "next";
import { PublicTransparencyPage } from "@/components/public/transparency/public-transparency-page";

export const metadata: Metadata = {
  title: "Transparência Viva SEMEAR",
  description: "Sínteses públicas, revisadas e agregadas das escutas territoriais do projeto SEMEAR."
};

export default function PublicoTransparenciaVivaPage() {
  return <PublicTransparencyPage apiPath="/api/public/transparencia-viva" />;
}
