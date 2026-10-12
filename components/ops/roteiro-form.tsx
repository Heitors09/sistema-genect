"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uid } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import type { RoteiroModelo } from "@/lib/types";
import { newStage, useStore } from "@/lib/store/store";
import { Button, Field, Input } from "../ui";
import {
  FluxoEditor,
  defaultPassoSetor,
  valueFromRoteiro,
  type FluxoEditorValue,
} from "../roteiro/fluxo-editor";

function destinoAposSalvar(voltar?: string | null, roteiroId?: string) {
  const base = !voltar || !voltar.startsWith("/") || voltar.startsWith("//") ? "/roteiros" : voltar;
  if (!roteiroId) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}roteiro=${encodeURIComponent(roteiroId)}`;
}

export function RoteiroForm({ initial, voltar }: { initial?: RoteiroModelo; voltar?: string | null }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [fluxo, setFluxo] = useState<FluxoEditorValue>(() =>
    initial?.etapas.length
      ? valueFromRoteiro(initial.etapas, initial.arestas, initial.inicioId)
      : { etapas: [defaultPassoSetor(state.boardNodes)], arestas: [], inicioId: undefined },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Dê um nome ao roteiro";
    if (!fluxo.etapas.length) e.passos = "Monte ao menos uma etapa no fluxograma";
    const semTerceiro = fluxo.etapas.find((p) => p.terceirizado && !p.terceirizadoId);
    if (semTerceiro) e.passos = "Escolha o terceirizado em cada parte terceirizada";
    const semSetor = fluxo.etapas.find((p) => !p.macroId);
    if (semSetor) e.passos = "Cada etapa precisa de um setor do quadro";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save(ev: FormEvent) {
    ev.preventDefault();
    if (!isAdmin || !validate()) return;
    const id = initial?.id ?? uid("rot");
    dispatch({
      type: "SAVE_ROTEIRO",
      roteiro: {
        id,
        nome: nome.trim(),
        etapas: fluxo.etapas.map((p) => ({ ...p })),
        arestas: fluxo.arestas.map((a) => ({ ...a })),
        inicioId: fluxo.inicioId ?? fluxo.etapas[0]?.id,
      },
    });
    router.push(destinoAposSalvar(voltar, id));
  }

  function remove() {
    if (!initial || !isAdmin) return;
    dispatch({ type: "DELETE_ROTEIRO", id: initial.id });
    router.push("/roteiros");
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="surface rounded-md p-4">
        <Field label="Nome do roteiro" error={errors.nome} hint="Aparece na lista ao criar uma OP">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Vestido verão" required />
        </Field>
      </div>
      <FluxoEditor
        value={fluxo}
        onChange={setFluxo}
        setores={state.boardNodes}
        terceirizados={state.terceirizados}
        onAddSetor={(nomeNovo) => {
          const x = Math.max(0, ...state.boardNodes.map((n) => n.x), 0) + 280;
          const node = newStage("custom", nomeNovo.trim() || "Novo card", x, 140);
          const last = [...state.boardNodes].sort((a, b) => a.x - b.x).at(-1);
          dispatch({
            type: "SET_BOARD",
            nodes: [...state.boardNodes, node],
            edges: last
              ? [...state.boardEdges, { id: `e-${node.id}`, source: last.id, target: node.id }]
              : state.boardEdges,
          });
          return node.id;
        }}
        onRenameSetor={(setorId, nomeNovo) => {
          dispatch({ type: "RENAME_STAGE", id: setorId, label: nomeNovo.trim() || "Setor" });
        }}
        onAddTerceirizado={(nomeNovo) => {
          const id = uid("ter");
          dispatch({
            type: "SAVE_TERCEIRIZADO",
            terceirizado: {
              id,
              nome: nomeNovo,
              servicos: [],
              especialidade: "",
              valorPorPeca: 0,
              ativo: true,
            },
          });
          return id;
        }}
        onAddServico={(terceirizadoId, nomeNovo) => {
          const id = uid("svc");
          const atual = state.terceirizados.find((t) => t.id === terceirizadoId);
          if (!atual) return id;
          dispatch({
            type: "SAVE_TERCEIRIZADO",
            terceirizado: {
              ...atual,
              servicos: [...servicosDe(atual), { id, nome: nomeNovo, valorPorPeca: 0 }],
            },
          });
          return id;
        }}
      />
      {errors.passos ? <p className="text-[11px] text-rose">{errors.passos}</p> : null}
      {isAdmin ? (
        <div className="flex flex-wrap justify-end gap-2">
          {initial ? (
            <Button type="button" variant="danger" onClick={remove}>
              Excluir
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => router.push(destinoAposSalvar(voltar))}>
            Cancelar
          </Button>
          <Button type="submit">{initial ? "Salvar roteiro" : "Criar roteiro"}</Button>
        </div>
      ) : (
        <p className="text-sm text-mute">Apenas o administrador edita roteiros.</p>
      )}
    </form>
  );
}
