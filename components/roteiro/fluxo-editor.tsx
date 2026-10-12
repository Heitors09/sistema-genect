"use client";

import type { Connection } from "@xyflow/react";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { uid } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import { arestasFromLinear, ensureRoteiroGraph } from "@/lib/roteiro-graph";
import type { BoardNode, RoteiroAresta, RoteiroEtapaDef, Terceirizado } from "@/lib/types";
import { Button, CreatableSelect, Field, Input, Select, cn } from "../ui";
import { FluxoCanvas } from "./fluxo-canvas";

function nomePasso(
  passo: RoteiroEtapaDef,
  setores: BoardNode[],
  terceirizados: Terceirizado[],
) {
  if (!passo.terceirizado) {
    return passo.nome?.trim() || setores.find((s) => s.id === passo.macroId)?.label || "Setor";
  }
  const t = terceirizados.find((x) => x.id === passo.terceirizadoId);
  const svc = t ? servicosDe(t).find((s) => s.id === passo.servicoId) : undefined;
  if (svc && t) return `${svc.nome} · ${t.nome}`;
  if (t) return t.nome;
  return passo.nome?.trim() || "Terceirizado";
}

export function defaultPassoSetor(setores: BoardNode[]): RoteiroEtapaDef {
  const setor = setores[0];
  return {
    id: uid("rp"),
    nome: setor?.label ?? "Setor",
    macroId: setor?.id ?? "",
  };
}

export function defaultPassoTerceirizado(setores: BoardNode[]): RoteiroEtapaDef {
  const quadro = setores.find((s) => s.kind === "costura") ?? setores[0];
  return {
    id: uid("rp"),
    nome: "Terceirizado",
    macroId: quadro?.id ?? "",
    terceirizado: true,
  };
}

export type FluxoEditorValue = {
  etapas: RoteiroEtapaDef[];
  arestas: RoteiroAresta[];
  inicioId?: string;
};

export function FluxoEditor({
  value,
  onChange,
  setores,
  terceirizados,
  onAddTerceirizado,
  onAddServico,
  onAddSetor,
  onRenameSetor,
  kicker = "Fluxograma do roteiro",
  hint = "Caminho linear da OP. Para bifurcar, use OP filha na ordem de produção.",
}: {
  value: FluxoEditorValue;
  onChange: (next: FluxoEditorValue) => void;
  setores: BoardNode[];
  terceirizados: Terceirizado[];
  onAddTerceirizado: (nome: string) => string;
  onAddServico: (terceirizadoId: string, nome: string) => string;
  /** Cria coluna no Kanban e devolve o id. */
  onAddSetor: (nome: string) => string;
  /** Renomeia a coluna do Kanban ligada ao card. */
  onRenameSetor: (setorId: string, nome: string) => void;
  kicker?: string;
  hint?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = value.etapas.find((e) => e.id === selectedId);

  const setorLabel = useMemo(
    () => (macroId: string) => setores.find((s) => s.id === macroId)?.label,
    [setores],
  );

  const canvasEtapas = useMemo(
    () =>
      value.etapas.map((e) => {
        const ter = e.terceirizadoId
          ? terceirizados.find((x) => x.id === e.terceirizadoId)
          : undefined;
        const svc =
          ter && e.servicoId ? servicosDe(ter).find((s) => s.id === e.servicoId) : undefined;
        return {
          id: e.id,
          nome: e.nome,
          macroId: e.macroId,
          terceirizado: e.terceirizado,
          terceirizadoNome: ter?.nome,
          servicoNome: svc?.nome,
          x: e.x,
          y: e.y,
        };
      }),
    [value.etapas, terceirizados],
  );

  function patchEtapa(id: string, partial: Partial<RoteiroEtapaDef>) {
    onChange({
      ...value,
      etapas: value.etapas.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...partial };
        if (partial.nome !== undefined) return next;
        if (
          partial.macroId !== undefined ||
          partial.terceirizadoId !== undefined ||
          partial.servicoId !== undefined ||
          partial.terceirizado !== undefined
        ) {
          return { ...next, nome: nomePasso(next, setores, terceirizados) };
        }
        return next;
      }),
    });
  }

  function appendEtapa(novo: RoteiroEtapaDef) {
    const fromId = selectedId ?? value.etapas[value.etapas.length - 1]?.id;
    const arestas = [...value.arestas];
    if (fromId) {
      arestas.push({
        id: uid("rae"),
        fromId,
        toId: novo.id,
        kind: "sequencia",
      });
    }
    const etapas = [...value.etapas, novo];
    onChange({
      etapas,
      arestas: arestas.length ? arestas : arestasFromLinear(etapas),
      inicioId: value.inicioId ?? etapas[0]?.id,
    });
    setSelectedId(novo.id);
  }

  function addNovoCard() {
    const nome = "Novo card";
    const macroId = onAddSetor(nome);
    appendEtapa({
      id: uid("rp"),
      nome,
      macroId,
    });
  }

  function addTerceirizado() {
    appendEtapa(defaultPassoTerceirizado(setores));
  }

  function removeNode(id: string) {
    const etapas = value.etapas.filter((e) => e.id !== id);
    const arestas = value.arestas.filter((a) => a.fromId !== id && a.toId !== id);
    onChange({
      etapas,
      arestas,
      inicioId: value.inicioId === id ? etapas[0]?.id : value.inicioId,
    });
    if (selectedId === id) setSelectedId(null);
  }

  function removeSelected() {
    if (!selectedId) return;
    removeNode(selectedId);
  }

  function onDisconnect(edgeId: string) {
    onChange({
      ...value,
      arestas: value.arestas.filter((a) => a.id !== edgeId),
    });
  }

  function onConnect(c: Connection) {
    if (!c.source || !c.target || c.source === c.target) return;
    if (value.arestas.some((a) => a.fromId === c.source && a.toId === c.target)) return;
    // Roteiro = caminho único. Bifurcação só via OP filha na OP.
    const arestas = value.arestas.filter((a) => a.fromId !== c.source);
    arestas.push({
      id: uid("rae"),
      fromId: c.source,
      toId: c.target,
      kind: "sequencia",
    });
    onChange({ ...value, arestas });
  }

  function onNodesChangePos(positions: { id: string; x: number; y: number }[]) {
    const map = new Map(positions.map((p) => [p.id, p]));
    onChange({
      ...value,
      etapas: value.etapas.map((e) => {
        const p = map.get(e.id);
        return p ? { ...e, x: p.x, y: p.y } : e;
      }),
    });
  }

  function setNomeCard(nome: string) {
    if (!selected) return;
    patchEtapa(selected.id, { nome });
    if (!selected.terceirizado && selected.macroId) {
      onRenameSetor(selected.macroId, nome.trim() || "Setor");
    }
  }

  const t = selected ? terceirizados.find((x) => x.id === selected.terceirizadoId) : undefined;
  const servicos = t ? servicosDe(t) : [];

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">{kicker}</p>
          <p className="mt-1 text-[11px] text-faint">
            {hint} X na seta desconecta · X no card remove.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="soft" onClick={addNovoCard}>
            <Plus size={13} /> Novo card
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={addTerceirizado}>
            <Plus size={13} /> Terceirizado
          </Button>
        </div>
      </div>

      {value.etapas.length ? (
        <FluxoCanvas
          etapas={canvasEtapas}
          arestas={value.arestas}
          setorLabel={setorLabel}
          editable
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onDeleteNode={removeNode}
          onNodesChangePos={onNodesChangePos}
          onSelect={setSelectedId}
          selectedId={selectedId}
          height={340}
        />
      ) : (
        <p className="rounded-md border border-dashed border-line px-3 py-10 text-center text-[12px] text-mute">
          Clique em “Novo card” para montar o caminho linear. Bifurcar = OP filha na OP.
        </p>
      )}

      {selected ? (
        <div className="mt-3 space-y-2 rounded-md border border-line bg-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Editar etapa · {selected.terceirizado ? "terceirizado" : "setor / Kanban"}
            </p>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
              aria-label="Remover etapa"
              onClick={removeSelected}
            >
              <Trash2 size={13} />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={selected.terceirizado ? "sm:col-span-2" : "sm:col-span-2"}>
              <Field
                label="Nome do card"
                hint={
                  selected.terceirizado
                    ? "Aparece no fluxograma (terceirizado usa serviço · nome ao escolher)"
                    : "Este nome é a coluna no Kanban"
                }
              >
                <Input
                  value={selected.nome}
                  onChange={(e) => setNomeCard(e.target.value)}
                  placeholder="Ex.: Beneficiamento"
                />
              </Field>
            </div>
            {selected.terceirizado ? (
              <>
                <Field label="Nome do terceirizado" hint="Quem executa esta etapa">
                  <CreatableSelect
                    value={selected.terceirizadoId ?? ""}
                    emptyLabel="Escolher terceirizado"
                    addLabel="+ Novo terceirizado"
                    addPlaceholder="Nome do terceirizado"
                    options={terceirizados.filter((x) => x.ativo).map((x) => ({ value: x.id, label: x.nome }))}
                    onChange={(id) => {
                      const next = terceirizados.find((x) => x.id === id);
                      const first = next ? servicosDe(next)[0] : undefined;
                      patchEtapa(selected.id, { terceirizadoId: id, servicoId: first?.id ?? "" });
                    }}
                    onAdd={(nome) => {
                      const id = onAddTerceirizado(nome);
                      patchEtapa(selected.id, { terceirizadoId: id, servicoId: "" });
                    }}
                  />
                </Field>
                <Field label="Serviço" hint="O que será cobrado / feito">
                  <CreatableSelect
                    value={selected.servicoId ?? ""}
                    emptyLabel={t ? "Escolher serviço" : "Escolha o terceirizado antes"}
                    addLabel="+ Novo serviço"
                    addPlaceholder="Ex.: Costura reta"
                    disabled={!t}
                    options={servicos.map((s) => ({
                      value: s.id,
                      label: `${s.nome} · R$ ${s.valorPorPeca.toFixed(2)}/pç`,
                    }))}
                    onChange={(id) => patchEtapa(selected.id, { servicoId: id })}
                    onAdd={(nome) => {
                      if (!selected.terceirizadoId) return;
                      const id = onAddServico(selected.terceirizadoId, nome);
                      patchEtapa(selected.id, { servicoId: id });
                    }}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Onde a OP aparece no Painel"
                    hint="Enquanto esta micro roda, a OP fica nesta coluna do Kanban (ex.: Costura)."
                  >
                    <Select
                      value={selected.macroId}
                      onChange={(e) => patchEtapa(selected.id, { macroId: e.target.value })}
                    >
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Field
                  label="Ou escolher coluna existente"
                  hint="Se preferir reutilizar uma coluna já do Kanban"
                >
                  <Select
                    value={selected.macroId}
                    onChange={(e) => {
                      const macroId = e.target.value;
                      const label = setores.find((s) => s.id === macroId)?.label ?? selected.nome;
                      patchEtapa(selected.id, { macroId, nome: label });
                    }}
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                if (selected.terceirizado) {
                  const nome = selected.nome.trim() || "Novo card";
                  const macroId = selected.macroId || onAddSetor(nome);
                  patchEtapa(selected.id, {
                    terceirizado: false,
                    terceirizadoId: undefined,
                    servicoId: undefined,
                    macroId,
                    nome,
                  });
                  onRenameSetor(macroId, nome);
                } else {
                  patchEtapa(selected.id, {
                    terceirizado: true,
                    nome: "Terceirizado",
                  });
                }
              }}
            >
              Alternar {selected.terceirizado ? "para setor / Kanban" : "para terceirizado"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange({ ...value, inicioId: selected.id })}
              className={cn(value.inicioId === selected.id && "text-mint")}
            >
              {value.inicioId === selected.id ? "Início do fluxo" : "Marcar como início"}
            </Button>
          </div>
        </div>
      ) : value.etapas.length ? (
        <p className="mt-2 text-[11px] text-faint">
          Clique num nó para editar o nome (Kanban) · arraste setas para ligar o fluxo.
        </p>
      ) : null}
    </div>
  );
}

export function valueFromRoteiro(etapas: RoteiroEtapaDef[], arestas?: RoteiroAresta[], inicioId?: string): FluxoEditorValue {
  const g = ensureRoteiroGraph({ id: "_", nome: "_", etapas, arestas, inicioId });
  return { etapas: g.etapas, arestas: g.arestas ?? [], inicioId: g.inicioId };
}
