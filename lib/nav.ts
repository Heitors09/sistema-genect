import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Boxes,
  CalendarClock,
  ClipboardList,
  Contact,
  GitBranch,
  LayoutDashboard,
  Layers,
  Receipt,
  Scissors,
  Settings,
  Shirt,
  TrendingUp,
  Users,
  Wallet,
  ShoppingCart,
  Landmark,
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
      { href: "/roteiros", label: "Roteiros", icon: GitBranch },
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
      { href: "/estoque", label: "Compras", icon: ShoppingCart },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    adminOnly: true,
    items: [
      { href: "/financeiro", label: "Visão gerencial", icon: Wallet },
      { href: "/financeiro/receitas", label: "Receitas (vendas)", icon: TrendingUp },
      { href: "/financeiro/despesas", label: "Despesas", icon: Receipt },
      { href: "/financeiro/fluxo-caixa", label: "Fluxo de caixa", icon: CalendarClock },
      { href: "/financeiro/plano-gerencial", label: "Plano gerencial", icon: Layers },
    ],
  },
  {
    id: "rh",
    label: "Recursos Humanos",
    adminOnly: true,
    items: [
      { href: "/rh", label: "Funcionários", icon: Contact },
      { href: "/financeiro/folha", label: "Folha de pagamento", icon: Banknote },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    adminOnly: true,
    items: [
      { href: "/cadastros", label: "Empresas e clientes", icon: Boxes },
      { href: "/cadastros/contas-bancarias", label: "Contas bancárias", icon: Landmark },
    ],
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
  if (role === "terceirizado") {
    return [
      {
        id: "producao",
        label: "Produção",
        items: [
          { href: "/ops", label: "Minhas OPs", icon: ClipboardList },
          { href: "/terceirizados", label: "Financeiro", icon: Wallet },
        ],
      },
      {
        id: "sistema",
        label: "Sistema",
        items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
      },
    ];
  }
  return navGroups.filter((g) => !g.adminOnly || role === "admin");
}

export function mobileTabs(role: Role): NavItem[] {
  if (role === "terceirizado") {
    return [
      { href: "/ops", label: "OPs", icon: ClipboardList },
      { href: "/terceirizados", label: "Financeiro", icon: Wallet },
      { href: "/configuracoes", label: "Ajustes", icon: Settings },
    ];
  }
  return [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    { href: "/ops", label: "OPs", icon: ClipboardList },
    { href: "/roteiros", label: "Roteiros", icon: GitBranch },
    { href: "/financeiro", label: "Caixa", icon: Wallet },
  ];
}
