"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Hash,
  Search,
  Shirt,
  Scissors,
  Users,
  type LucideIcon,
} from "lucide-react";
import { visibleGroups } from "@/lib/nav";
import { useStore } from "@/lib/store/store";
import { cn } from "../ui";

type Hit = {
  id: string;
  group: string;
  title: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
};

function matches(query: string, ...parts: Array<string | undefined>) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((part) => part?.toLowerCase().includes(q));
}

export function CommandSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { state, isAdmin, currentUser } = useStore();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const hits = useMemo(() => {
    const pages: Hit[] = visibleGroups(currentUser.role).flatMap((group) =>
      group.items.map((item) => ({
        id: `page-${item.href}`,
        group: "Páginas",
        title: item.label,
        hint: group.label,
        href: item.href,
        icon: item.icon,
      })),
    );

    const ops: Hit[] = state.ops
      .filter((op) => {
        if (isAdmin) return true;
        return currentUser.terceirizadoId
          ? op.terceirizadoIds.includes(currentUser.terceirizadoId)
          : false;
      })
      .map((op) => {
        const prod = state.produtos.find((p) => p.id === op.produtoId);
        const cli = state.clientes.find((c) => c.id === op.clienteId);
        return {
          id: `op-${op.id}`,
          group: "Ordens de produção",
          title: op.numero,
          hint: [prod?.nome, prod?.referencia, op.cor, cli?.nome].filter(Boolean).join(" · "),
          href: `/ops/${op.id}`,
          icon: ClipboardList,
        };
      })
      .filter((hit) => matches(query, hit.title, hit.hint));

    const produtos: Hit[] = state.produtos
      .map((p) => ({
        id: `prod-${p.id}`,
        group: "Produtos",
        title: p.nome,
        hint: [p.referencia, p.categoria, p.cores.join(", ")].filter(Boolean).join(" · "),
        href: `/produtos/${p.id}`,
        icon: Shirt,
      }))
      .filter((hit) => matches(query, hit.title, hit.hint));

    const insumos: Hit[] = state.insumos
      .map((i) => ({
        id: `ins-${i.id}`,
        group: "Insumos",
        title: i.descricao,
        hint: [i.codigo, i.categoria].filter(Boolean).join(" · "),
        href: `/insumos/${i.id}`,
        icon: Scissors,
      }))
      .filter((hit) => matches(query, hit.title, hit.hint));

    const cadastros: Hit[] = [
      ...state.clientes.map((c) => ({
        id: `cli-${c.id}`,
        group: "Cadastros",
        title: c.nome,
        hint: "Cliente",
        href: "/cadastros",
        icon: Users,
      })),
      ...state.terceirizados.map((t) => ({
        id: `ter-${t.id}`,
        group: "Cadastros",
        title: t.nome,
        hint: t.especialidade || "Terceirizado",
        href: "/terceirizados",
        icon: Users,
      })),
    ].filter((hit) => matches(query, hit.title, hit.hint));

    const paginas = pages.filter((hit) => matches(query, hit.title, hit.hint));
    const empty = !query.trim();

    const groups = empty
      ? [{ label: "Páginas", items: paginas }]
      : [
          { label: "Páginas", items: paginas.slice(0, 6) },
          { label: "Ordens de produção", items: ops.slice(0, 6) },
          { label: "Produtos", items: produtos.slice(0, 6) },
          { label: "Insumos", items: insumos.slice(0, 6) },
          ...(isAdmin ? [{ label: "Cadastros", items: cadastros.slice(0, 6) }] : []),
        ];

    return groups.filter((g) => g.items.length);
  }, [query, state, isAdmin, currentUser]);

  const flat = hits.flatMap((g) => g.items);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActive(0);
      return;
    }
    setActive(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
      }
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (ev.key === "Enter") {
        const hit = flat[active];
        if (!hit) return;
        ev.preventDefault();
        router.push(hit.href);
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, active, onClose, router]);

  if (!open) return null;

  let cursor = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-start md:px-3 md:pt-[16vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Fechar pesquisa"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Pesquisar no sistema"
        className="surface motion-rise-in relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-md pb-[env(safe-area-inset-bottom)] md:max-h-none md:max-w-xl md:rounded-md md:pb-0"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/16 md:hidden" />
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search size={15} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Pesquisar no sistema"
            className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint md:h-11 md:text-[13px]"
          />
          <button
            type="button"
            onClick={onClose}
            className="motion-press rounded-md px-2 py-1 text-[12px] text-mute hover:bg-white/8 hover:text-ink md:hidden"
          >
            Fechar
          </button>
          <kbd className="hidden rounded-md border border-line bg-elevated/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-faint md:inline">
            esc
          </kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 md:max-h-[min(28rem,58vh)] md:flex-none">
          {hits.length ? (
            hits.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="kicker px-2 pb-1.5">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((hit) => {
                    cursor += 1;
                    const index = cursor;
                    const Icon = hit.icon ?? Hash;
                    const selected = index === active;
                    return (
                      <button
                        key={hit.id}
                        type="button"
                        onMouseEnter={() => setActive(index)}
                        onClick={() => {
                          router.push(hit.href);
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left md:py-2",
                          selected
                            ? "bg-[#f3f4f6] text-[#0c0d10]"
                            : "text-ink hover:bg-elevated/80",
                        )}
                      >
                        <Icon
                          size={15}
                          className={selected ? "text-[#0c0d10]" : "text-faint"}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">{hit.title}</span>
                          {hit.hint ? (
                            <span className={cn("block truncate text-[11px]", selected ? "text-[#0c0d10]/60" : "text-faint")}>
                              {hit.hint}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-[13px] text-mute">Nada encontrado para “{query}”.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}
