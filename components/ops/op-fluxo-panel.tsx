"use client";

import type { Connection } from "@xyflow/react";
import { GitBranch, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { uid } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import {
  arestasFromLinear,
  ensureOpMicroGraph,
  sucessores,
} from "@/lib/roteiro-graph";
import type {
  BoardNode,
  MicroEtapa,
  MicroStatus,
  OrdemProducao,
  RoteiroAresta,
  Terceirizado,
} from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { FluxoCanvas, type FluxoEtapaView } from "../roteiro/fluxo-canvas";
import { Button, ButtonLink, CreatableSelect, Field, Input, Select, cn } from "../ui";

type DraftNode = {
  id: string;
  nome: string;
  macroId: string;
  x: number;
  y: number;
  terceirizado?: boolean;
  terceirizadoId?: string;
  servicoId?: string;
};

type DraftRole = "inicio" | "caminho";

export function OpFluxoPanel({
  op,
  isAdmin,
  canAct,
  onMicroAction,
  onSplit,
  stageLabel,
  boardNodes,
  terceirizados,
}: {
  op: OrdemProducao;
  isAdmin: boolean;
  canAct: (m: MicroEtapa) => boolean;
  onMicroAction: (microId: string, status: MicroStatus) => void;
  onSplit: (payload: {
    quantidade: number;
    terceirizadoId?: string;
    stageId: string;
    fromMicroId?: string;
    nextMicroId?: string;
    novoInicio?: {
      nome: string;
      macroId: string;
      terceirizado?: boolean;
      terceirizadoId?: string;
      servicoId?: string;
    };
    novoDestino?: {
      nome: string;
      macroId: string;
      terceirizado?: boolean;
      terceirizadoId?: string;
      servicoId?: string;
      reunirEmId?: string;
    };
    reunirEmId?: string;
  }) => void;
  stageLabel: (macroId: string) => string | undefined;
  boardNodes: BoardNode[];
  terceirizados: Terceirizado[];
}) {
  const { dispatch } = useStore();
  const graph = useMemo(
    () =>
      ensureOpMicroGraph({
        micros: op.micros,
        microArestas: op.microArestas,
        microAtualId: op.microAtualId,
      }),
    [op.micros, op.microArestas, op.microAtualId],
  );

  const [filhaOn, setFilhaOn] = useState(false);
  const [fromId, setFromId] = useState<string | null>(null);
  const [pathId, setPathId] = useState<string | null>(null);
  const [reunirId, setReunirId] = useState<string | null>(null);
  const [draftInicio, setDraftInicio] = useState<DraftNode | null>(null);
  const [draftCaminho, setDraftCaminho] = useState<DraftNode | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftRole | null>(null);
  const [draftEdges, setDraftEdges] = useState<RoteiroAresta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState("50");
  const [terId, setTerId] = useState(op.terceirizadoIds[0] ?? "");

  const baseArestas = graph.microArestas.length
    ? graph.microArestas
    : arestasFromLinear(graph.micros);
  const graphEdit = isAdmin;
  const draft =
    editingDraft === "inicio"
      ? draftInicio
      : editingDraft === "caminho"
        ? draftCaminho
        : draftCaminho ?? draftInicio;

  const canvasEtapas: FluxoEtapaView[] = useMemo(
    () => [
      ...graph.micros.map((m) => {
        const ter = m.terceirizadoId
          ? terceirizados.find((x) => x.id === m.terceirizadoId)
          : undefined;
        const svc =
          ter && m.servicoId ? servicosDe(ter).find((s) => s.id === m.servicoId) : undefined;
        return {
          id: m.id,
          nome: m.nome,
          macroId: m.macroId,
          terceirizado: Boolean(m.terceirizadoId),
          terceirizadoNome: ter?.nome,
          servicoNome: svc?.nome,
          status: m.status,
          x: m.x,
          y: m.y,
          mark:
            fromId === m.id
              ? ("from" as const)
              : pathId === m.id
                ? ("dest" as const)
                : reunirId === m.id
                  ? ("reunir" as const)
                  : undefined,
        };
      }),
      ...(draftInicio
        ? [
            {
              id: draftInicio.id,
              nome: draftInicio.nome,
              macroId: draftInicio.macroId,
              terceirizado: draftInicio.terceirizado,
              terceirizadoNome: draftInicio.terceirizadoId
                ? terceirizados.find((x) => x.id === draftInicio.terceirizadoId)?.nome
                : undefined,
              x: draftInicio.x,
              y: draftInicio.y,
              mark: "from" as const,
            },
          ]
        : []),
      ...(draftCaminho
        ? [
            {
              id: draftCaminho.id,
              nome: draftCaminho.nome,
              macroId: draftCaminho.macroId,
              terceirizado: draftCaminho.terceirizado,
              terceirizadoNome: draftCaminho.terceirizadoId
                ? terceirizados.find((x) => x.id === draftCaminho.terceirizadoId)?.nome
                : undefined,
              x: draftCaminho.x,
              y: draftCaminho.y,
              mark: "draft" as const,
            },
          ]
        : []),
    ],
    [graph.micros, draftInicio, draftCaminho, fromId, pathId, reunirId, terceirizados],
  );

  const canvasArestas = useMemo(() => {
    const extra = draftEdges.filter(
      (a) => !baseArestas.some((b) => b.fromId === a.fromId && b.toId === a.toId),
    );
    const withReunir =
      fromId && pathId && reunirId && pathId !== reunirId
        ? [
            ...extra,
            ...(extra.some((a) => a.fromId === pathId && a.toId === reunirId) ||
            baseArestas.some((a) => a.fromId === pathId && a.toId === reunirId)
              ? []
              : [
                  {
                    id: "preview-reunir",
                    fromId: pathId,
                    toId: reunirId,
                    kind: "reuniao" as const,
                    label: "reúne",
                  },
                ]),
          ]
        : extra;
    return [...baseArestas, ...withReunir];
  }, [baseArestas, draftEdges, fromId, pathId, reunirId]);

  const highlightIds = useMemo(
    () =>
      [fromId, pathId, reunirId, draftInicio?.id, draftCaminho?.id].filter(Boolean) as string[],
    [fromId, pathId, reunirId, draftInicio, draftCaminho],
  );

  const selected = selectedId
    ? graph.micros.find((m) => m.id === selectedId)
    : undefined;

  const fromNome =
    draftInicio && fromId === draftInicio.id
      ? draftInicio.nome
      : graph.micros.find((m) => m.id === fromId)?.nome;
  const pathNome =
    draftCaminho && pathId === draftCaminho.id
      ? draftCaminho.nome
      : graph.micros.find((m) => m.id === pathId)?.nome;
  const reunirNome = graph.micros.find((m) => m.id === reunirId)?.nome;

  function resetFilha() {
    setFilhaOn(false);
    setFromId(null);
    setPathId(null);
    setReunirId(null);
    setDraftInicio(null);
    setDraftCaminho(null);
    setEditingDraft(null);
    setDraftEdges([]);
  }

  function startFilha() {
    setFilhaOn(true);
    setFromId(null);
    setPathId(null);
    setReunirId(null);
    setDraftInicio(null);
    setDraftCaminho(null);
    setEditingDraft(null);
    setDraftEdges([]);
    setSelectedId(null);
  }

  function onSelectNode(id: string | null) {
    if (!filhaOn) {
      setSelectedId(id);
      return;
    }
    if (!id) return;
    if (draftInicio?.id === id) {
      setEditingDraft("inicio");
      return;
    }
    if (draftCaminho?.id === id) {
      setEditingDraft("caminho");
      return;
    }
    // 1 · início
    if (!fromId) {
      setFromId(id);
      setDraftInicio(null);
      return;
    }
    // 2 · caminho da filha
    if (!pathId) {
      if (id === fromId) return;
      setPathId(id);
      setDraftCaminho(null);
      setDraftEdges((prev) => {
        const next = prev.filter((a) => a.fromId !== fromId);
        next.push({
          id: uid("rae"),
          fromId,
          toId: id,
          kind: "filha",
          label: "filha",
        });
        return next;
      });
      const m = graph.micros.find((x) => x.id === id);
      if (m?.terceirizadoId) setTerId(m.terceirizadoId);
      return;
    }
    // 3 · destino final (reúne) — não apaga início/caminho
    if (id === fromId || id === pathId) return;
    setReunirId(id);
  }

  function makeDraft(role: DraftRole): DraftNode {
    const anchor =
      role === "inicio"
        ? graph.micros.find((m) => m.id === graph.microAtualId) ?? graph.micros[0]
        : graph.micros.find((m) => m.id === fromId) ?? graph.micros[0];
    return {
      id: uid("mic"),
      nome: role === "inicio" ? "Início da filha" : "Caminho da filha",
      macroId: anchor?.macroId || boardNodes[0]?.id || "",
      x: (anchor?.x ?? 120) + (role === "inicio" ? 0 : 220),
      y: (anchor?.y ?? 40) + (role === "inicio" ? 110 : 90),
      terceirizado: Boolean(terId),
      terceirizadoId: terId || undefined,
    };
  }

  function addDraftInicio() {
    const novo = makeDraft("inicio");
    setDraftInicio(novo);
    setFromId(novo.id);
    setEditingDraft("inicio");
  }

  function addDraftCaminho() {
    if (!fromId) return;
    const novo = makeDraft("caminho");
    setDraftCaminho(novo);
    setPathId(novo.id);
    setEditingDraft("caminho");
    setDraftEdges((prev) => {
      const next = prev.filter((a) => !(a.fromId === fromId && a.kind === "filha"));
      next.push({
        id: uid("rae"),
        fromId,
        toId: novo.id,
        kind: "filha",
        label: "filha",
      });
      return next;
    });
  }

  function onConnect(c: Connection) {
    if (!c.source || !c.target || c.source === c.target) return;

    if (filhaOn) {
      const draftIds = new Set(
        [draftInicio?.id, draftCaminho?.id].filter(Boolean) as string[],
      );
      if (draftIds.has(c.source) || draftIds.has(c.target)) {
        if (!fromId && !draftIds.has(c.source)) setFromId(c.source);
        if (draftCaminho && c.target === draftCaminho.id) {
          setFromId((prev) => prev ?? c.source);
          setPathId(draftCaminho.id);
        }
        if (draftCaminho && c.source === draftCaminho.id && !draftIds.has(c.target)) {
          setReunirId(c.target);
        }
        setDraftEdges((prev) => {
          const next = prev.filter(
            (a) => !(a.fromId === c.source && a.toId === c.target),
          );
          const kind =
            draftCaminho && c.source === draftCaminho.id && !draftIds.has(c.target)
              ? ("reuniao" as const)
              : ("filha" as const);
          next.push({
            id: uid("rae"),
            fromId: c.source as string,
            toId: c.target as string,
            kind,
            label: kind === "filha" ? "filha" : "reúne",
          });
          return next;
        });
        return;
      }

      if (!fromId) {
        setFromId(c.source);
        setPathId(c.target);
      } else if (!pathId) {
        setPathId(c.target === fromId ? c.source : c.target);
      } else {
        const dest = c.target === pathId || c.target === fromId ? c.source : c.target;
        if (dest !== fromId && dest !== pathId) setReunirId(dest);
      }
      setDraftEdges((prev) => {
        const next = prev.filter(
          (a) => !(a.fromId === c.source && a.toId === c.target),
        );
        next.push({
          id: uid("rae"),
          fromId: c.source as string,
          toId: c.target as string,
          kind: pathId && (c.source === pathId || c.target === reunirId) ? "reuniao" : "filha",
          label: pathId && c.source === pathId ? "reúne" : "filha",
        });
        return next;
      });
      return;
    }

    if (!graphEdit) return;
    if (baseArestas.some((a) => a.fromId === c.source && a.toId === c.target)) return;
    for (const a of baseArestas.filter((x) => x.fromId === c.source)) {
      dispatch({ type: "REMOVE_MICRO_ARESTA", opId: op.id, arestaId: a.id });
    }
    dispatch({
      type: "ADD_MICRO_ARESTA",
      opId: op.id,
      aresta: {
        id: uid("rae"),
        fromId: c.source,
        toId: c.target,
        kind: "sequencia",
      },
    });
  }

  function onDisconnect(edgeId: string) {
    if (edgeId === "preview-reunir") {
      setReunirId(null);
      return;
    }
    if (draftEdges.some((a) => a.id === edgeId)) {
      const gone = draftEdges.find((a) => a.id === edgeId);
      setDraftEdges((prev) => prev.filter((a) => a.id !== edgeId));
      if (gone?.kind === "reuniao" || gone?.toId === reunirId) setReunirId(null);
      return;
    }
    if (!graphEdit) return;
    dispatch({ type: "REMOVE_MICRO_ARESTA", opId: op.id, arestaId: edgeId });
  }

  function onDeleteNode(nodeId: string) {
    if (draftInicio?.id === nodeId) {
      setDraftInicio(null);
      if (fromId === nodeId) setFromId(null);
      if (editingDraft === "inicio") setEditingDraft(null);
      setDraftEdges((prev) => prev.filter((a) => a.fromId !== nodeId && a.toId !== nodeId));
      return;
    }
    if (draftCaminho?.id === nodeId) {
      setDraftCaminho(null);
      if (pathId === nodeId) setPathId(null);
      if (editingDraft === "caminho") setEditingDraft(null);
      setDraftEdges((prev) => prev.filter((a) => a.fromId !== nodeId && a.toId !== nodeId));
      return;
    }
    if (filhaOn) {
      if (fromId === nodeId) setFromId(null);
      if (pathId === nodeId) setPathId(null);
      if (reunirId === nodeId) setReunirId(null);
      return;
    }
    if (!graphEdit) return;
    if (graph.micros.length <= 1) return;
    dispatch({ type: "REMOVE_MICRO", opId: op.id, microId: nodeId });
    if (selectedId === nodeId) setSelectedId(null);
  }

  function onNodesPos(positions: { id: string; x: number; y: number }[]) {
    if (draftInicio) {
      const p = positions.find((x) => x.id === draftInicio.id);
      if (p) setDraftInicio((d) => (d ? { ...d, x: p.x, y: p.y } : d));
    }
    if (draftCaminho) {
      const p = positions.find((x) => x.id === draftCaminho.id);
      if (p) setDraftCaminho((d) => (d ? { ...d, x: p.x, y: p.y } : d));
    }
  }

  function setDraftField(role: DraftRole, patch: Partial<DraftNode>) {
    if (role === "inicio") {
      setDraftInicio((d) => (d ? { ...d, ...patch } : d));
    } else {
      setDraftCaminho((d) => (d ? { ...d, ...patch } : d));
    }
  }

  function confirmSplit() {
    if (!fromId || !pathId) return;
    const q = Number(qty) || 0;
    if (q <= 0 || q >= op.quantidade) return;
    const pathMacro =
      draftCaminho && pathId === draftCaminho.id
        ? draftCaminho.macroId
        : graph.micros.find((m) => m.id === pathId)?.macroId;
    const stageId = pathMacro || op.stageId;
    const reunirOk =
      reunirId && graph.micros.some((m) => m.id === reunirId) ? reunirId : undefined;

    onSplit({
      quantidade: q,
      terceirizadoId: terId || undefined,
      stageId,
      fromMicroId: draftInicio && fromId === draftInicio.id ? undefined : fromId,
      nextMicroId: draftCaminho && pathId === draftCaminho.id ? undefined : pathId,
      novoInicio:
        draftInicio && fromId === draftInicio.id
          ? {
              nome: draftInicio.nome.trim() || "Início da filha",
              macroId: draftInicio.macroId,
              terceirizado: Boolean(draftInicio.terceirizadoId || terId),
              terceirizadoId: draftInicio.terceirizadoId || terId || undefined,
              servicoId: draftInicio.servicoId,
            }
          : undefined,
      novoDestino:
        draftCaminho && pathId === draftCaminho.id
          ? {
              nome: draftCaminho.nome.trim() || "Caminho da filha",
              macroId: draftCaminho.macroId,
              terceirizado: Boolean(draftCaminho.terceirizadoId || terId),
              terceirizadoId: draftCaminho.terceirizadoId || terId || undefined,
              servicoId: draftCaminho.servicoId,
              reunirEmId: reunirOk,
            }
          : undefined,
      reunirEmId: draftCaminho && pathId === draftCaminho.id ? undefined : reunirOk,
    });
    resetFilha();
  }

  const hint = !filhaOn
    ? op.parentOpId
      ? "Ramo desta OP filha. Edits na mãe com origem ligada sincronizam aqui."
      : graphEdit
        ? "Caminho linear da OP. Para bifurcar, use “OP filha”. X na seta desconecta · X no card remove."
        : "Clique num nó para agir. Para bifurcar o caminho, use “OP filha”."
    : !fromId
      ? "1 · Início: clique num card existente ou “Novo início”."
      : !pathId
        ? "2 · Caminho: clique no card do ramo da filha ou “Novo caminho”."
        : !reunirId
          ? "3 · Destino final: clique no card onde a filha reúne com a mãe (opcional, recomendado)."
          : "Ramo completo. Confira e gere a OP filha.";

  const outs = fromId ? sucessores(baseArestas, fromId) : [];
  const canGenerate =
    Boolean(fromId && pathId) && Number(qty) > 0 && Number(qty) < op.quantidade;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="kicker">
            Fluxograma {op.roteiroNome ? `· ${op.roteiroNome}` : ""}
            {op.parentOpId ? " · ramo filha" : ""}
            {filhaOn ? " · criando filha" : ""}
          </p>
          <p className="mt-1 text-[12px] text-faint">{hint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && !op.parentOpId ? (
            filhaOn ? (
              <Button size="sm" variant="ghost" onClick={resetFilha}>
                <X size={13} /> Cancelar
              </Button>
            ) : (
              <Button size="sm" variant="soft" onClick={startFilha}>
                <GitBranch size={13} /> OP filha
              </Button>
            )
          ) : null}
          {isAdmin ? (
            <ButtonLink href={`/ops/${op.id}/editar`} size="sm" variant="ghost">
              Editar roteiro
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {filhaOn ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber/30 bg-amber/5 px-3 py-2 text-[12px]">
          <Button size="sm" variant="ghost" disabled={Boolean(fromId)} onClick={addDraftInicio}>
            <Plus size={13} /> Novo início
          </Button>
          <Button size="sm" variant="ghost" disabled={!fromId || Boolean(pathId)} onClick={addDraftCaminho}>
            <Plus size={13} /> Novo caminho
          </Button>
          {fromId && outs.length ? (
            <span className="text-faint">
              Já ligados:{" "}
              {outs
                .map((a) => graph.micros.find((m) => m.id === a.toId)?.nome)
                .filter(Boolean)
                .join(", ")}
            </span>
          ) : null}
          <span className="ml-auto text-mute">
            1 início → 2 caminho → 3 destino final
          </span>
        </div>
      ) : null}

      <FluxoCanvas
        etapas={canvasEtapas}
        arestas={canvasArestas}
        setorLabel={stageLabel}
        atualId={filhaOn ? undefined : graph.microAtualId}
        highlightIds={highlightIds}
        editable={filhaOn || graphEdit}
        preferPositions={filhaOn}
        onConnect={filhaOn || graphEdit ? onConnect : undefined}
        onDisconnect={filhaOn || graphEdit ? onDisconnect : undefined}
        onDeleteNode={filhaOn || graphEdit ? onDeleteNode : undefined}
        onNodesChangePos={filhaOn ? onNodesPos : undefined}
        onSelect={onSelectNode}
        selectedId={filhaOn ? null : selectedId}
        height={filhaOn ? 400 : 360}
      />

      {filhaOn ? (
        <div className="space-y-2 rounded-md border border-line bg-panel p-3">
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span
              className={cn(
                "rounded-md border px-2 py-1",
                fromId ? "border-amber/40 bg-amber/10 text-ink" : "border-line text-faint",
              )}
            >
              1 Início: {fromNome ?? "—"}
            </span>
            <span className="self-center text-faint">→</span>
            <span
              className={cn(
                "rounded-md border px-2 py-1",
                pathId ? "border-sky/40 bg-sky/10 text-ink" : "border-line text-faint",
              )}
            >
              2 Caminho: {pathNome ?? "—"}
            </span>
            <span className="self-center text-faint">→</span>
            <span
              className={cn(
                "rounded-md border px-2 py-1",
                reunirId ? "border-mint/40 bg-mint/10 text-ink" : "border-line text-faint",
              )}
            >
              3 Destino: {reunirNome ?? "— clique no quadro —"}
            </span>
          </div>

          {draft && editingDraft ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={editingDraft === "inicio" ? "Nome do início" : "Nome do caminho"}>
                <Input
                  value={draft.nome}
                  onChange={(e) => setDraftField(editingDraft, { nome: e.target.value })}
                />
              </Field>
              <Field label="Onde a OP aparece no Painel">
                <Select
                  value={draft.macroId}
                  onChange={(e) => setDraftField(editingDraft, { macroId: e.target.value })}
                >
                  {boardNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nome do terceirizado">
                <Select
                  value={draft.terceirizadoId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const t = terceirizados.find((x) => x.id === id);
                    const first = t ? servicosDe(t)[0] : undefined;
                    setDraftField(editingDraft, {
                      terceirizado: Boolean(id),
                      terceirizadoId: id || undefined,
                      servicoId: first?.id,
                      nome: first && t ? `${first.nome} · ${t.nome}` : draft.nome,
                    });
                    if (id) setTerId(id);
                  }}
                >
                  <option value="">— interno / sem terceirizado —</option>
                  {terceirizados.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Serviço">
                <Select
                  value={draft.servicoId ?? ""}
                  disabled={!draft.terceirizadoId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const t = terceirizados.find((x) => x.id === draft.terceirizadoId);
                    const svc = t ? servicosDe(t).find((s) => s.id === sid) : undefined;
                    setDraftField(editingDraft, {
                      servicoId: sid || undefined,
                      nome: svc && t ? `${svc.nome} · ${t.nome}` : draft.nome,
                    });
                  }}
                >
                  <option value="">— serviço —</option>
                  {(() => {
                    const t = draft.terceirizadoId
                      ? terceirizados.find((x) => x.id === draft.terceirizadoId)
                      : undefined;
                    return t ? servicosDe(t) : [];
                  })().map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} · R$ {s.valorPorPeca.toFixed(2)}/pç
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Peças da filha">
              <Input value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label="Terceirizado (opcional)">
              <Select value={terId} onChange={(e) => setTerId(e.target.value)}>
                <option value="">— interno —</option>
                {terceirizados.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button
                size="sm"
                variant="soft"
                className="w-full"
                disabled={!canGenerate}
                onClick={confirmSplit}
              >
                Gerar OP filha
              </Button>
            </div>
          </div>
        </div>
      ) : selected ? (
        <div className="space-y-2 rounded-md border border-line bg-panel p-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-medium text-ink">{selected.nome}</span>
            <span className="text-faint">{selected.status}</span>
            {canAct(selected) ? (
              <span className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMicroAction(selected.id, "em_andamento")}
                >
                  Iniciar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMicroAction(selected.id, "pausada")}
                >
                  Pausar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMicroAction(selected.id, "concluida")}
                >
                  Finalizar
                </Button>
              </span>
            ) : null}
          </div>
          {isAdmin ? (
            <div className="grid gap-2 border-t border-line pt-2 sm:grid-cols-3">
              <Field
                label="Onde a OP aparece no Painel"
                hint="Coluna do Kanban enquanto esta micro está ativa"
              >
                <Select
                  value={selected.macroId}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_MICRO",
                      opId: op.id,
                      microId: selected.id,
                      patch: { macroId: e.target.value },
                    })
                  }
                >
                  {boardNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nome do terceirizado">
                <CreatableSelect
                  value={selected.terceirizadoId ?? ""}
                  emptyLabel="Interno / sem terceirizado"
                  addLabel="+ Novo terceirizado"
                  addPlaceholder="Nome do terceirizado"
                  options={terceirizados.filter((x) => x.ativo).map((x) => ({ value: x.id, label: x.nome }))}
                  onChange={(id) => {
                    const t = terceirizados.find((x) => x.id === id);
                    const first = t ? servicosDe(t)[0] : undefined;
                    dispatch({
                      type: "UPDATE_MICRO",
                      opId: op.id,
                      microId: selected.id,
                      patch: {
                        terceirizadoId: id || undefined,
                        servicoId: first?.id,
                      },
                    });
                  }}
                  onAdd={(nome) => {
                    const id = uid("ter");
                    dispatch({
                      type: "SAVE_TERCEIRIZADO",
                      terceirizado: {
                        id,
                        nome,
                        servicos: [],
                        especialidade: "",
                        valorPorPeca: 0,
                        ativo: true,
                      },
                    });
                    dispatch({
                      type: "UPDATE_MICRO",
                      opId: op.id,
                      microId: selected.id,
                      patch: { terceirizadoId: id, servicoId: undefined },
                    });
                  }}
                />
              </Field>
              <Field label="Serviço do terceirizado">
                <CreatableSelect
                  value={selected.servicoId ?? ""}
                  emptyLabel={
                    selected.terceirizadoId ? "Escolher serviço" : "Escolha o terceirizado"
                  }
                  addLabel="+ Novo serviço"
                  addPlaceholder="Ex.: Costura reta"
                  disabled={!selected.terceirizadoId}
                  options={(() => {
                    const t = selected.terceirizadoId
                      ? terceirizados.find((x) => x.id === selected.terceirizadoId)
                      : undefined;
                    return t ? servicosDe(t) : [];
                  })().map((s) => ({
                    value: s.id,
                    label: `${s.nome} · R$ ${s.valorPorPeca.toFixed(2)}/pç`,
                  }))}
                  onChange={(id) =>
                    dispatch({
                      type: "UPDATE_MICRO",
                      opId: op.id,
                      microId: selected.id,
                      patch: { servicoId: id || undefined },
                    })
                  }
                  onAdd={(nome) => {
                    if (!selected.terceirizadoId) return;
                    const id = uid("svc");
                    const atual = terceirizados.find((t) => t.id === selected.terceirizadoId);
                    if (!atual) return;
                    dispatch({
                      type: "SAVE_TERCEIRIZADO",
                      terceirizado: {
                        ...atual,
                        servicos: [...servicosDe(atual), { id, nome, valorPorPeca: 0 }],
                      },
                    });
                    dispatch({
                      type: "UPDATE_MICRO",
                      opId: op.id,
                      microId: selected.id,
                      patch: { servicoId: id },
                    });
                  }}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
