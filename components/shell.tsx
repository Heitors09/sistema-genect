"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  Moon,
  Search,
  X,
} from "lucide-react";
import { mobileTabs, navItemActive, visibleGroups } from "@/lib/nav";
import { useStore } from "@/lib/store/store";
import { DemoAssistant } from "./chat/demo-assistant";
import { cn } from "./ui";

function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid place-items-center rounded-md border border-line font-semibold tracking-[-0.06em] text-ink",
        "bg-[linear-gradient(180deg,#242530_0%,#16171f_100%)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.12)]",
        compact ? "h-7 w-full text-[13px]" : "h-8 w-8 text-[13px]",
      )}
    >
      G
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch, currentUser, isAdmin } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const groups = useMemo(() => visibleGroups(currentUser.role), [currentUser.role]);
  const search = query.trim().toLowerCase();

  useEffect(() => {
    if (!query) {
      setTyping(false);
      return;
    }
    setTyping(true);
    const t = window.setTimeout(() => setTyping(false), 220);
    return () => window.clearTimeout(t);
  }, [query]);

  const tabs = mobileTabs(currentUser.role);

  const opsCount = state.ops.filter((o) => {
    if (o.status === "finalizada" || o.status === "cancelada") return false;
    if (!isAdmin && currentUser.terceirizadoId) {
      return o.terceirizadoIds.includes(currentUser.terceirizadoId);
    }
    return true;
  }).length;
  const alertas = state.insumos.filter((i) => i.estoqueAtual - i.reservado <= i.estoqueMinimo).length;

  const navHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const currentTitle =
    groups
      .flatMap((g) => g.items)
      .find((i) => navItemActive(pathname, i.href, navHrefs))
      ?.label ?? "GenectHub";

  return (
    <div className="flex h-dvh overflow-hidden bg-[#05060a] p-0 text-ink md:p-3">
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/55 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-bg md:rounded-md md:border md:border-line md:shadow-[0_28px_80px_rgb(0_0_0_/_0.55)]">
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-line bg-sidebar",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[min(20rem,88vw)] max-md:transition-transform max-md:duration-200",
          menuOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          collapsed ? "md:w-[72px]" : "md:w-[248px]",
        )}
      >
        <div className={cn("flex items-center gap-2 px-3 py-3", collapsed && "md:justify-center md:px-2")}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Expandir menu"
              aria-label="Expandir menu"
              className="group relative hidden h-7 w-full place-items-center md:grid"
            >
              <BrandMark compact />
              <span className="absolute inset-0 grid place-items-center rounded-md bg-[#16171f]/92 text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <ChevronRight size={16} strokeWidth={2} />
              </span>
            </button>
          ) : null}
          <div className={cn(collapsed && "md:hidden")}>
            <BrandMark />
          </div>
          <div className={cn("min-w-0", collapsed && "md:hidden")}>
            <p className="truncate text-[14px] font-semibold leading-tight tracking-[-0.035em]">
              GenectHub
            </p>
            <p className="truncate text-[10px] text-faint">Chão de fábrica</p>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="ml-auto grid h-10 w-10 place-items-center rounded-md text-mute hover:bg-elevated md:hidden"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className={cn(
              "ml-auto hidden h-8 w-8 place-items-center rounded-md text-mute hover:bg-elevated md:grid",
              collapsed && "md:hidden",
            )}
            aria-label="Recolher menu"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {(!collapsed || menuOpen) && (
          <div className={cn("px-3 pb-2", collapsed && "md:hidden")}>
            <div
              className={cn(
                "well flex h-11 items-center gap-2 rounded-md border px-3 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:h-8 md:px-2",
                query
                  ? "border-line-strong shadow-[0_0_0_1px_rgb(255_255_255_/_0.05)]"
                  : "border-line",
              )}
            >
              <Search
                size={13}
                className={cn(
                  "shrink-0 text-faint transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  typing && "scale-110 text-mute",
                )}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar no menu"
                className="w-full bg-transparent text-base outline-none placeholder:text-faint md:text-[12px]"
              />
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {groups.map((group) => {
            const groupHit = !search || group.label.toLowerCase().includes(search);
            const groupVisible = groupHit || group.items.some((i) => i.label.toLowerCase().includes(search));
            return (
            <div key={group.id} className={cn("nav-row mb-3", !groupVisible && "nav-row-hidden mb-0")}>
              <div className="nav-row-inner">
              {!collapsed || menuOpen ? (
                <p className={cn("kicker px-2 pb-1.5", collapsed && "md:hidden")}>
                  {group.label}
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = navItemActive(pathname, item.href, navHrefs);
                  const Icon = item.icon;
                  const match = groupHit || !search || item.label.toLowerCase().includes(search);
                  return (
                    <div key={item.href} className={cn("nav-row", !match && "nav-row-hidden")}>
                    <div className="nav-row-inner">
                    <Link
                      href={item.href}
                      title={item.label}
                      tabIndex={match ? 0 : -1}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-[14px] transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:min-h-0 md:px-2 md:py-1.5 md:text-[13px]",
                        collapsed && "md:justify-center md:px-0",
                        active
                          ? "bg-elevated/90 font-medium text-ink shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06)]"
                          : "text-mute hover:bg-panel hover:text-ink",
                      )}
                    >
                      <Icon size={16} className={active ? "text-ink" : "text-faint"} />
                      {!collapsed || menuOpen ? (
                        <span className={cn("truncate", collapsed && "md:hidden")}>{item.label}</span>
                      ) : null}
                      {(!collapsed || menuOpen) && item.href === "/ops" ? (
                        <span className={cn("ml-auto rounded-md border border-line bg-elevated/80 px-1.5 text-[10px] text-mute", collapsed && "md:hidden")}>
                          {opsCount}
                        </span>
                      ) : null}
                    </Link>
                    </div>
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
            );
          })}
        </nav>

        <div className="border-t border-line p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-2">
          <div className={cn("surface rounded-md p-2", collapsed && "md:p-1.5")}>
            {!collapsed || menuOpen ? (
              <p className={cn("kicker px-1 pb-1.5", collapsed && "md:hidden")}>
                Perfil de acesso
              </p>
            ) : null}
            <select
              value={state.usuarioId}
              onChange={(e) => dispatch({ type: "SET_USER", usuarioId: e.target.value })}
              className={cn(
                "well h-11 w-full rounded-md border border-line px-2 text-base outline-none md:h-auto md:py-1.5 md:text-[12px]",
                collapsed && "md:px-1 md:text-[10px]",
              )}
              aria-label="Alternar perfil"
            >
              {state.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.role === "admin" ? "Admin · " : "Terceiro · "}
                  {u.nome}
                </option>
              ))}
            </select>
            {!collapsed || menuOpen ? (
              <div className={cn("mt-2 flex items-center gap-2 px-1", collapsed && "md:hidden")}>
                <div className="grid h-8 w-8 place-items-center rounded-md bg-elevated text-[10px] font-semibold">
                  {currentUser.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium">{currentUser.nome}</p>
                  <p className="truncate text-[10px] text-mute">{currentUser.email}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-sidebar/70 px-3 backdrop-blur md:h-12 md:gap-3 md:px-4">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-ink hover:bg-elevated md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 md:hidden">
            <p className="truncate text-[13px] font-semibold">{currentTitle}</p>
            <p className="truncate text-[10px] text-mute">
              {isAdmin ? "Administrador" : "Terceirizado"}
            </p>
          </div>
          <div className="hidden items-center gap-2 text-[12px] text-faint md:flex">
            {isAdmin ? "Visão do administrador" : "Visão do terceirizado"}
            <span className="text-faint/70">·</span>
            <span className="text-mute">Genect Confecções</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-md border border-line text-mute hover:bg-elevated md:h-8 md:w-8"
              aria-label="Alertas de estoque"
            >
              <Bell size={16} />
              {alertas > 0 ? (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose md:right-1.5 md:top-1.5" />
              ) : null}
            </button>
            <button
              type="button"
              className="hidden h-8 w-8 place-items-center rounded-md border border-line text-mute hover:bg-elevated md:grid"
              aria-label="Tema"
            >
              <Moon size={15} />
            </button>
            <div className="hidden items-center gap-2 rounded-md border border-line bg-elevated/80 py-1 pl-1 pr-3 md:flex">
              <div className="grid h-6 w-6 place-items-center rounded-md bg-[#eceef2] text-[10px] font-semibold text-[#0c0d10]">
                {currentUser.nome.slice(0, 2).toUpperCase()}
              </div>
              <span className="max-w-[9rem] truncate text-[12px] text-ink">{currentUser.nome.split(" ")[0]}</span>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto overscroll-contain pb-[calc(8.75rem+env(safe-area-inset-bottom))] md:pb-24">
          {children}
        </main>
        <DemoAssistant />
      </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid h-14 grid-cols-5">
          {tabs.map((item) => {
            const active = navItemActive(pathname, item.href, tabs.map((t) => t.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[10px]",
                  active ? "text-ink" : "text-mute",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] text-mute"
          >
            <Menu size={18} />
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
}
