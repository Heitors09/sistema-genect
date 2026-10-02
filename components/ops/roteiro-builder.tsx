"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { uid } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import type { BoardNode, RoteiroEtapaDef, RoteiroModelo, Terceirizado } from "@/lib/types";
import { Button, CreatableSelect, Select, cn } from "../ui";

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

export function etapasFromMicros(
  micros: {
    id: string;
    nome: string;
    macroId: string;
    terceirizadoId?: string;
    servicoId?: string;
    altGroup?: string;
  }[],
): RoteiroEtapaDef[] {
  return micros.map((m) => ({
    id: m.id,
    nome: m.nome,
    macroId: m.macroId,
    terceirizado: Boolean(m.terceirizadoId),
    terceirizadoId: m.terceirizadoId,
    servicoId: m.servicoId,
    altGroup: m.altGroup,
  }));
}

function nomePasso(
  passo: RoteiroEtapaDef,
  setores: BoardNode[],
  terceirizados: Terceirizado[],
) {
  if (!passo.terceirizado) {
    return setores.find((s) => s.id === passo.macroId)?.label ?? "Setor";
  }
  const t = terceirizados.find((x) => x.id === passo.terceirizadoId);
  const svc = t ? servicosDe(t).find((s) => s.id === passo.servicoId) : undefined;
  if (svc && t) return `${svc.nome} · ${t.nome}`;
  if (t) return t.nome;
  return "Terceirizado";
}

export function resumoRoteiro(etapas: RoteiroEtapaDef[]) {
  return etapas
    .map((etapa, index) => {
      const prev = etapas[index - 1];
      const ou = Boolean(etapa.altGroup && prev?.altGroup === etapa.altGroup);
      return ou ? `ou ${etapa.nome}` : etapa.nome;
    })
    .join(" → ");
}

export function RoteiroBuilder({
  passos,
  onChange,
  setores,
  terceirizados,
  modelos = [],
  modeloId = "",
  onModelo,
  modeloFooter,
  kicker = "Roteiro desta OP",
  hint = "O caminho inteiro, do início ao fim. Setor interno ou terceirizado — e “ou” para uma parte alternativa.",
  onAddTerceirizado,
  onAddServico,
}: {
  passos: RoteiroEtapaDef[];
  onChange: (next: RoteiroEtapaDef[]) => void;
  setores: BoardNode[];
  terceirizados: Terceirizado[];
  modelos?: RoteiroModelo[];
  modeloId?: string;
  onModelo?: (id: string) => void;
  modeloFooter?: ReactNode;
  kicker?: string;
  hint?: string;
  onAddTerceirizado: (nome: string) => string;
  onAddServico: (terceirizadoId: string, nome: string) => string;
}) {
  function patch(id: string, partial: Partial<RoteiroEtapaDef>) {
    onChange(
      passos.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...partial };
        return { ...next, nome: nomePasso(next, setores, terceirizados) };
      }),
    );
  }

  function remove(id: string) {
    onChange(passos.filter((p) => p.id !== id));
  }

  function addSetor() {
    onChange([...passos, defaultPassoSetor(setores)]);
  }

  function addTerceirizado() {
    onChange([...passos, defaultPassoTerceirizado(setores)]);
  }

  function addOu(afterId: string) {
    const origem = passos.find((p) => p.id === afterId);
    if (!origem) return;
    const group = origem.altGroup ?? uid("alt");
    const novo: RoteiroEtapaDef = {
      ...defaultPassoTerceirizado(setores),
      altGroup: group,
      macroId: origem.macroId,
    };
    const next = passos.flatMap((p) => {
      if (p.id !== afterId) return [p];
      return [{ ...p, altGroup: group }, novo];
    });
    onChange(next);
  }

  return (
    <div className="rounded-md border border-line p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker">{kicker}</p>
          <p className="mt-1 text-[11px] text-faint">{hint}</p>
        </div>
        {onModelo ? (
          <Select
            className="w-full sm:w-72 sm:min-w-72 sm:shrink-0"
            triggerClassName="h-8 min-h-8 px-2.5 text-[12px]"
            value={modeloId}
            onChange={(e) => onModelo(e.target.value)}
            footer={modeloFooter}
          >
            <option value="">Criar na hora</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className="space-y-0">
        {passos.map((passo, index) => {
          const prev = passos[index - 1];
          const isOu = Boolean(passo.altGroup && prev?.altGroup === passo.altGroup);
          const t = terceirizados.find((x) => x.id === passo.terceirizadoId);
          const servicos = t ? servicosDe(t) : [];
          return (
            <div key={passo.id}>
              {index > 0 ? (
                <div className="flex items-center gap-2 py-1 pl-3">
                  <span className={cn("h-4 w-px bg-line-strong", isOu && "opacity-0")} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-faint">
                    {isOu ? "ou" : "depois"}
                  </span>
                </div>
              ) : null}
              <div
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  passo.terceirizado ? "border-sky/25 bg-sky/5" : "border-line bg-elevated/40",
                  isOu && "ml-6",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-faint">
                    {isOu ? "Parte alternativa" : passo.terceirizado ? "Terceirizado" : "Setor"}
                  </p>
                  <button
                    type="button"
                    className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                    aria-label="Remover etapa"
                    onClick={() => remove(passo.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passo.terceirizado ? (
                    <>
                      <CreatableSelect
                        value={passo.terceirizadoId ?? ""}
                        emptyLabel="Quem faz"
                        addLabel="+ Novo terceirizado"
                        addPlaceholder="Nome do terceirizado"
                        options={terceirizados.filter((x) => x.ativo).map((x) => ({ value: x.id, label: x.nome }))}
                        onChange={(id) => {
                          const next = terceirizados.find((x) => x.id === id);
                          const first = next ? servicosDe(next)[0] : undefined;
                          patch(passo.id, { terceirizadoId: id, servicoId: first?.id ?? "" });
                        }}
                        onAdd={(nome) => {
                          const id = onAddTerceirizado(nome);
                          patch(passo.id, { terceirizadoId: id, servicoId: "" });
                        }}
                      />
                      <CreatableSelect
                        value={passo.servicoId ?? ""}
                        emptyLabel={t ? "Qual serviço" : "Serviço (escolha quem faz)"}
                        addLabel="+ Novo serviço"
                        addPlaceholder="Ex.: Costura reta"
                        disabled={!t}
                        options={servicos.map((s) => ({
                          value: s.id,
                          label: `${s.nome} · R$ ${s.valorPorPeca.toFixed(2)}/pç`,
                        }))}
                        onChange={(id) => patch(passo.id, { servicoId: id })}
                        onAdd={(nome) => {
                          if (!passo.terceirizadoId) return;
                          const id = onAddServico(passo.terceirizadoId, nome);
                          patch(passo.id, { servicoId: id });
                        }}
                      />
                      <Select
                        className="sm:col-span-2"
                        triggerClassName="h-8 min-h-8 px-2.5 text-[12px]"
                        value={passo.macroId}
                        onChange={(e) => patch(passo.id, { macroId: e.target.value })}
                      >
                        {setores.map((s) => (
                          <option key={s.id} value={s.id}>
                            Aparece no quadro {s.label}
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : (
                    <Select
                      className="sm:col-span-2"
                      triggerClassName="h-8 min-h-8 px-2.5 text-[12px]"
                      value={passo.macroId}
                      onChange={(e) => patch(passo.id, { macroId: e.target.value })}
                    >
                      {setores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                {passo.terceirizado && !isOu ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky hover:underline"
                    onClick={() => addOu(passo.id)}
                  >
                    <GitBranch size={12} />
                    ou outra parte / outro terceirizado
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!passos.length ? (
        <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-[12px] text-mute">
          Monte o caminho: um setor da fábrica ou um terceirizado, na ordem em que a peça passa.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={addSetor}>
          <Plus size={13} /> Setor
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={addTerceirizado}>
          <Plus size={13} /> Terceirizado
        </Button>
      </div>
    </div>
  );
}
