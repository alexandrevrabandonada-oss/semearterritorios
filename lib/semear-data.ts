import {
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  Layers3,
  Lightbulb,
  Map,
  MapPinned,
  MessageSquareText,
  Tag
} from "lucide-react";
import type { ComponentType } from "react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

export type StatCard = {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: "green" | "earth" | "yellow";
};

export type EmptyModule = {
  title: string;
  href: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Ações", href: "/acoes", icon: ClipboardList },
  { label: "Escutas", href: "/escutas", icon: MessageSquareText },
  { label: "Territórios", href: "/territorios", icon: MapPinned },
  { label: "Mapa", href: "/mapa", icon: Map },
  { label: "Relatórios", href: "/relatorios", icon: FileText },
  { label: "Pós-banca", href: "/pos-banca", icon: Lightbulb },
  { label: "Ajuda", href: "/ajuda", icon: HelpCircle }
];

export const statCards: StatCard[] = [
  {
    label: "Total de ações",
    value: "12",
    description: "Atividades territoriais registradas para acompanhamento.",
    icon: ClipboardList,
    tone: "green"
  },
  {
    label: "Total de escutas",
    value: "86",
    description: "Registros simulados para desenhar o painel inicial.",
    icon: MessageSquareText,
    tone: "earth"
  },
  {
    label: "Bairros visitados",
    value: "9",
    description: "Territórios acompanhados nas ações mockadas.",
    icon: MapPinned,
    tone: "green"
  },
  {
    label: "Temas recorrentes",
    value: "14",
    description: "Marcadores ainda manuais, sem IA e sem banco.",
    icon: Tag,
    tone: "yellow"
  },
  {
    label: "Pendências de revisão",
    value: "18",
    description: "Escutas aguardando leitura e validação da equipe.",
    icon: Layers3,
    tone: "earth"
  }
];

export const emptyModules: EmptyModule[] = [
  {
    title: "Ações",
    href: "/acoes",
    description: "As atividades de campo aparecerão aqui quando o cadastro for criado.",
    icon: ClipboardList
  },
  {
    title: "Escutas",
    href: "/escutas",
    description: "A fala original e a síntese livre terão espaço próprio antes da codificação da equipe.",
    icon: MessageSquareText
  },
  {
    title: "Territórios",
    href: "/territorios",
    description: "Bairros, localidades e referências comunitárias serão organizados sem expor dados pessoais.",
    icon: MapPinned
  },
  {
    title: "Mapa",
    href: "/mapa",
    description: "A leitura territorial será feita por bairro, com padrões agregados e devolutiva popular.",
    icon: Map
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    description: "Os relatórios mensais serão montados a partir de registros revisados pela equipe.",
    icon: FileText
  }
];
