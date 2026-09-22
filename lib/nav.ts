import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Package,
  Receipt,
  Scissors,
  Settings,
  Shirt,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { Role } from "./types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Visão geral",
    items: [{ href: "/", label: "Painel", icon: LayoutDashboard }],
  },
  {
    id: "producao",
    label: "Produção",
    items: [
      { href: "/ops", label: "Ordens de produção", icon: ClipboardList },
      { href: "/producao", label: "Chão de fábrica", icon: Factory },
      { href: "/terceirizados", label: "Terceirizados", icon: Users },
    ],
  },
  {
    id: "produtos",
    label: "Produtos",
    items: [{ href: "/produtos", label: "Cadastro e estoque", icon: Shirt }],
  },
  {
    id: "insumos",
    label: "Insumos",
    items: [
      { href: "/insumos", label: "Cadastro de insumos", icon: Scissors },
      { href: "/estoque", label: "Estoque e entradas", icon: Warehouse },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    adminOnly: true,
    items: [
      { href: "/financeiro", label: "Visão gerencial", icon: Wallet },
      { href: "/financeiro/pagar", label: "Contas a pagar", icon: Receipt },
      { href: "/financeiro/receber", label: "Faturar e receber", icon: Package },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    adminOnly: true,
    items: [{ href: "/cadastros", label: "Empresas e clientes", icon: Boxes }],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

export function navHrefMatches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function navItemActive(pathname: string, href: string, hrefs: string[]) {
  if (!navHrefMatches(pathname, href)) return false;
  return !hrefs.some((other) => other !== href && other.length > href.length && navHrefMatches(pathname, other));
}

export function visibleGroups(role: Role) {
  return navGroups
    .filter((g) => (role === "admin" ? true : !g.adminOnly))
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => (role === "admin" ? true : !i.adminOnly)),
    }));
}

export function mobileTabs(role: Role): NavItem[] {
  const extra: NavItem =
    role === "admin"
      ? { href: "/financeiro", label: "Caixa", icon: Wallet }
      : { href: "/terceirizados", label: "Terceiros", icon: Users };
  return [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    { href: "/ops", label: "OPs", icon: ClipboardList },
    { href: "/producao", label: "Chão", icon: Factory },
    extra,
  ];
}
