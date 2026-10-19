"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Bell, Check, CircleDot, Clock3, Package, X } from "lucide-react";
import { formatRelative } from "@/lib/format";
import { subscribeLiveNotifs } from "@/lib/notif-live";
import { useStore } from "@/lib/store/store";
import type { Notificacao } from "@/lib/types";
import { cn } from "@/components/ui";

type Filtro = "todas" | "nao_lidas";

function tipoMeta(tipo: Notificacao["tipo"]) {
  if (tipo === "op_atrasada") {
    return {
      label: "Prazo",
      Icon: Clock3,
      accent: "bg-rose/80",
      iconWrap: "bg-rose/12 text-rose",
      bar: "bg-rose/70",
    };
  }
  if (tipo === "estoque_insuficiente") {
    return {
      label: "Estoque",
      Icon: Package,
      accent: "bg-rose/80",
      iconWrap: "bg-rose/12 text-rose",
      bar: "bg-rose/70",
    };
  }
  return {
    label: "Produção",
    Icon: CircleDot,
    accent: "bg-sky/80",
    iconWrap: "bg-sky/12 text-sky",
    bar: "bg-sky/70",
  };
}

export function NotifBell() {
  const { state, dispatch, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [mounted, setMounted] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 12 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const naoLidas = state.notificacoes.filter((n) => !n.lida).length;
  const alertasEstoque = isAdmin
    ? state.insumos.filter((i) => i.estoqueAtual - i.reservado <= i.estoqueMinimo).length
    : 0;
  const alertas = naoLidas + alertasEstoque;

  const lista = useMemo(() => {
    const base = filtro === "nao_lidas" ? state.notificacoes.filter((n) => !n.lida) : state.notificacoes;
    return base;
  }, [filtro, state.notificacoes]);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !desktop) return;
    function place() {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
      });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, desktop]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    if (!desktop) document.body.style.overflow = "hidden";
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, desktop]);

  const panel = open ? (
    <>
      <button
        type="button"
        aria-label="Fechar notificações"
        className="scrim fixed inset-0 z-[79] bg-black/50 md:hidden"
        onClick={() => setOpen(false)}
      />
        <div
          ref={panelRef}
          className={cn(
            "notif-panel fixed z-[80] overflow-hidden border border-line bg-card",
            "shadow-[0_24px_56px_rgb(0_0_0_/_0.22),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
            "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:flex max-md:max-h-[min(88dvh,40rem)] max-md:w-full max-md:flex-col max-md:rounded-t-md max-md:pb-[env(safe-area-inset-bottom)]",
            "md:w-[min(24rem,calc(100vw-1.5rem))] md:rounded-md",
          )}
          style={desktop ? { top: pos.top, right: pos.right } : undefined}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/16 md:hidden" />
          <div className="border-b border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold tracking-[-0.02em]">Notificações</p>
                <p className="text-[11px] text-faint">
                  {naoLidas === 0 ? "Tudo em dia" : `${naoLidas} não lida${naoLidas === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
              {naoLidas > 0 ? (
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-[11px] text-mute hover:bg-elevated hover:text-ink"
                  onClick={() => dispatch({ type: "MARK_ALL_NOTIF" })}
                >
                  Marcar todas
                </button>
              ) : null}
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-elevated hover:text-ink md:hidden"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {(
                [
                  ["todas", "Todas"],
                  ["nao_lidas", "Não lidas"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFiltro(id)}
                  className={cn(
                    "motion-press h-7 rounded-md px-2.5 text-[11px]",
                    filtro === id
                      ? "bg-elevated text-ink"
                      : "text-mute hover:bg-elevated/60 hover:text-ink",
                  )}
                >
                  {label}
                  {id === "nao_lidas" && naoLidas > 0 ? (
                    <span className="ml-1.5 text-rose">{naoLidas}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {alertasEstoque > 0 ? (
            <Link
              href="/estoque"
              onClick={() => setOpen(false)}
              className="flex items-start gap-2.5 border-b border-line bg-rose/10 px-3 py-2.5 hover:bg-rose/15"
            >
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-rose/12 text-rose">
                <Package size={14} />
              </span>
              <span className="min-w-0">
                <p className="text-[12px] font-medium text-ink">
                  {alertasEstoque} insumo{alertasEstoque === 1 ? "" : "s"} no ponto de pedido
                </p>
                <p className="text-[11px] text-faint">Abrir compras para lançar entrada</p>
              </span>
            </Link>
          ) : null}

          <div className="notif-scroll min-h-0 flex-1 overflow-y-auto max-md:max-h-none md:max-h-[min(22rem,calc(100dvh-12rem))]">
            {lista.length === 0 ? (
              <div className="grid place-items-center px-4 py-10 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-line text-faint">
                  {filtro === "nao_lidas" ? <Check size={16} /> : <Bell size={16} />}
                </span>
                <p className="mt-3 text-[13px] font-medium">
                  {filtro === "nao_lidas" ? "Nenhuma não lida" : "Sem avisos no momento"}
                </p>
                <p className="mt-1 text-[11px] text-faint">
                  {filtro === "nao_lidas"
                    ? "Prazos e etapas novas aparecem aqui."
                    : "O sistema avisa atrasos e próximas etapas."}
                </p>
              </div>
            ) : (
              lista.map((n) => <NotifRow key={n.id} n={n} onOpen={() => setOpen(false)} />)
            )}
          </div>
        </div>
    </>
  ) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="motion-press relative grid h-10 w-10 place-items-center rounded-md border border-line text-mute hover:bg-elevated md:h-8 md:w-8"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} />
        {alertas > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-0.5 text-[9px] font-semibold leading-none text-white">
            {alertas > 9 ? "9+" : alertas}
          </span>
        ) : null}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

function NotifRow({ n, onOpen }: { n: Notificacao; onOpen: () => void }) {
  const { dispatch } = useStore();
  const meta = tipoMeta(n.tipo);
  const Icon = meta.Icon;
  const href = n.opId ? `/ops/${n.opId}` : "/ops";

  return (
    <article
      className={cn(
        "relative border-b border-line last:border-b-0 transition-[background-color] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        n.lida ? "bg-card" : "bg-elevated",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-0.5", n.lida ? "bg-transparent" : meta.accent)} />
      <div className="flex gap-2.5 px-3 py-2.5 pl-3.5">
        <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md", meta.iconWrap)}>
          <Icon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-[12px] font-medium leading-snug", n.lida ? "text-mute" : "text-ink")}>
              {n.titulo}
            </p>
            <time className="shrink-0 text-[10px] text-faint" dateTime={n.createdAt}>
              {formatRelative(n.createdAt)}
            </time>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-faint">{n.texto}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-faint">{meta.label}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Link
              href={href}
              onClick={onOpen}
              className="inline-flex min-h-9 items-center rounded-md border border-line px-3 py-1.5 text-[12px] text-ink hover:bg-elevated md:min-h-0 md:px-2 md:py-1 md:text-[11px]"
            >
              Abrir
            </Link>
            <button
              type="button"
              className="inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-[12px] text-mute hover:bg-elevated hover:text-ink md:min-h-0 md:px-2 md:py-1 md:text-[11px]"
              onClick={() => dispatch({ type: "MARK_NOTIF", id: n.id, lida: !n.lida })}
            >
              {n.lida ? "Não lida" : "Marcar lida"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function NotifToasts() {
  const [toasts, setToasts] = useState<Notificacao[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return subscribeLiveNotifs((n) => {
      setToasts((cur) => [n, ...cur.filter((x) => x.id !== n.id)].slice(0, 3));
    });
  }, []);

  function dismiss(id: string) {
    setToasts((cur) => cur.filter((n) => n.id !== id));
  }

  if (!mounted || !toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-3 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] z-[80] flex w-[min(20rem,calc(100vw-1.5rem))] flex-col-reverse gap-2 md:right-6 md:bottom-20">
      {toasts.map((n) => (
        <ToastCard key={n.id} n={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>,
    document.body,
  );
}

function ToastCard({ n, onDismiss }: { n: Notificacao; onDismiss: () => void }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDismiss);
  done.current = onDismiss;
  const meta = tipoMeta(n.tipo);
  const Icon =
    n.tipo === "op_atrasada" || n.tipo === "estoque_insuficiente" ? AlertTriangle : meta.Icon;

  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 5200);
    const gone = window.setTimeout(() => done.current(), 5680);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
  }, []);

  function open() {
    if (n.opId) router.push(`/ops/${n.opId}`);
    onDismiss();
  }

  return (
    <output
      className={cn(
        "surface pointer-events-auto block overflow-hidden rounded-md",
        leaving ? "notif-toast-out" : "notif-toast-in",
      )}
    >
      <div className="relative flex gap-2.5 p-3 pl-3.5">
        <span className={cn("absolute inset-y-0 left-0 w-0.5", meta.accent)} />
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 gap-2.5 text-left"
        >
          <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md", meta.iconWrap)}>
            <Icon size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-snug text-ink">{n.titulo}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-mute">{n.texto}</p>
          </span>
        </button>
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={onDismiss}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint hover:bg-elevated hover:text-ink"
        >
          <X size={13} />
        </button>
      </div>
      {leaving ? null : <span className={cn("notif-toast-bar block h-0.5 w-full", meta.bar)} />}
    </output>
  );
}
