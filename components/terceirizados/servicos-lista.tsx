"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, Trash2, Wallet } from "lucide-react";
import { brl, formatDate, nInt, todayISO } from "@/lib/format";
import { findAcerto, opsDoTerceirizado, totaisAcerto, valorMicroTerceirizado } from "@/lib/terceirizado-ops";
import type { MicroEtapa, OrdemProducao } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Badge, Button, DataTable, DateInput, Empty, Field, Input, Modal, Select, Td } from "../ui";
import { AcertoControls } from "./acerto-controls";

type Situacao = "aguardando" | "com_terceirizado" | "parcial" | "devolvido" | "pendencia";

const situacaoLabel: Record<Situacao, string> = {
  aguardando: "Aguardando envio",
  com_terceirizado: "Com o terceirizado",
  parcial: "Devolução parcial",
  devolvido: "Devolvido",
  pendencia: "Pendência",
};
const situacaoTone = {
  aguardando: "mute",
  com_terceirizado: "sky",
  parcial: "amber",
  devolvido: "mint",
  pendencia: "rose",
} as const;

export function devolvidoMicro(m: MicroEtapa) {
  const total = m.quantidade || 0;
  if (m.status === "concluida") return total;
  return Math.min(total, (m.entregas ?? []).reduce((a, e) => a + e.quantidade, 0));
}

/** Peças que estão com o terceirizado agora (enviadas e ainda não devolvidas). */
export function comTerceirizado(m: MicroEtapa) {
  if (situacaoMicro(m) === "aguardando") return 0;
  return Math.max(0, (m.quantidade || 0) - devolvidoMicro(m));
}

export function situacaoMicro(m: MicroEtapa): Situacao {
  const dev = devolvidoMicro(m);
  if (m.status === "concluida" || (m.quantidade > 0 && dev >= m.quantidade)) return "devolvido";
  if (m.status === "pendencia") return "pendencia";
  if (dev > 0) return "parcial";
  if (m.status === "aguardando") return "aguardando";
  return "com_terceirizado";
}

type Linha = { op: OrdemProducao; micro: MicroEtapa; terceirizadoId: string };

/** Lista de serviços prestados/em andamento, com status, entregas parciais e pagamento. */
export function ServicosLista({ terceirizadoId }: { terceirizadoId?: string }) {
  const { state, isAdmin } = useStore();
  const [filtro, setFiltro] = useState<"abertos" | Situacao | "todos">("abertos");
  const [q, setQ] = useState("");
  const [entregaDe, setEntregaDe] = useState<Linha | null>(null);
  const [pagarDe, setPagarDe] = useState<Linha | null>(null);

  const linhas = useMemo(() => {
    const ters = terceirizadoId
      ? state.terceirizados.filter((t) => t.id === terceirizadoId)
      : state.terceirizados;
    const out: Linha[] = [];
    for (const t of ters) {
      for (const op of opsDoTerceirizado(state.ops, t.id)) {
        for (const micro of op.micros.filter((m) => m.terceirizadoId === t.id)) {
          out.push({ op, micro, terceirizadoId: t.id });
        }
      }
    }
    const query = q.trim().toLowerCase();
    return out
      .filter(({ micro, op }) => {
        const s = situacaoMicro(micro);
        if (filtro === "abertos" && s === "devolvido") return false;
        if (filtro !== "abertos" && filtro !== "todos" && s !== filtro) return false;
        if (query && !`${op.numero} ${micro.nome}`.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        const order: Situacao[] = ["pendencia", "parcial", "com_terceirizado", "aguardando", "devolvido"];
        return order.indexOf(situacaoMicro(a.micro)) - order.indexOf(situacaoMicro(b.micro)) || a.op.numero.localeCompare(b.op.numero);
      });
  }, [state.ops, state.terceirizados, terceirizadoId, filtro, q]);

  const resumo = useMemo(() => {
    let com = 0;
    let voltou = 0;
    for (const { micro } of linhas) {
      voltou += devolvidoMicro(micro);
      com += comTerceirizado(micro);
    }
    return { com, voltou };
  }, [linhas]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar OP ou serviço" className="w-full sm:max-w-xs" />
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="w-full sm:w-52">
          <option value="abertos">Em andamento</option>
          <option value="com_terceirizado">Com o terceirizado</option>
          <option value="parcial">Devolução parcial</option>
          <option value="aguardando">Aguardando envio</option>
          <option value="pendencia">Pendência</option>
          <option value="devolvido">Devolvidos</option>
          <option value="todos">Todos</option>
        </Select>
        <p className="text-[12px] text-mute sm:ml-auto">
          <span className="tabular-nums text-ink">{nInt.format(resumo.com)}</span> pç com terceirizado ·{" "}
          <span className="tabular-nums text-ink">{nInt.format(resumo.voltou)}</span> pç já voltaram
        </p>
      </div>

      {linhas.length ? (
        <DataTable
          headers={[
            "OP",
            ...(terceirizadoId ? [] : ["Terceirizado"]),
            "Serviço",
            "Enviado",
            "Voltou",
            "Com ele",
            "Status",
            "Valor",
            "Pagamento",
          ]}
        >
          {linhas.map((l) => {
            const { op, micro } = l;
            const s = situacaoMicro(micro);
            const dev = devolvidoMicro(micro);
            const pend = comTerceirizado(micro);
            const valor = valorMicroTerceirizado(op, micro, state.terceirizados);
            const acerto = findAcerto(state.acertosTerceirizado, l.terceirizadoId, op.id, micro.id);
            const tot = totaisAcerto({
              valorOriginal: valor || acerto?.valorOriginal || 0,
              lancamentos: acerto?.lancamentos ?? [],
              desconto: acerto?.desconto ?? 0,
              pago: acerto?.pago ?? 0,
            });
            const pago = valor > 0 && tot.restante <= 0;
            const ultima = micro.entregas?.at(-1);
            return (
              <tr key={`${op.id}-${micro.id}`}>
                {[
                <Td key="op">
                  <Link href={`/ops/${op.id}`} className="font-mono text-[12px] text-sky hover:underline">
                    {op.numero}
                  </Link>
                </Td>,
                terceirizadoId ? null : (
                  <Td key="ter">
                    <Link href={`/terceirizados/${l.terceirizadoId}`} className="hover:text-sky hover:underline">
                      {state.terceirizados.find((t) => t.id === l.terceirizadoId)?.nome}
                    </Link>
                  </Td>
                ),
                <Td key="svc">{micro.nome}</Td>,
                <Td key="env" className="tabular-nums">{nInt.format(micro.quantidade || 0)}</Td>,
                <Td key="dev" className="tabular-nums">
                  {nInt.format(dev)}
                  {ultima && s !== "devolvido" ? (
                    <p className="text-[10px] text-faint">última {formatDate(ultima.data)}</p>
                  ) : null}
                </Td>,
                <Td key="pend" className="tabular-nums">{pend ? nInt.format(pend) : "—"}</Td>,
                <Td key="st">
                  <Badge tone={situacaoTone[s]}>{situacaoLabel[s]}</Badge>
                </Td>,
                <Td key="val" className="tabular-nums">{valor ? brl.format(valor) : "—"}</Td>,
                <Td key="pg">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {valor > 0 ? (
                      <Badge tone={pago ? "mint" : tot.pago > 0 ? "amber" : "mute"}>
                        {pago ? "Pago" : tot.pago > 0 ? `Resta ${brl.format(tot.restante)}` : "A pagar"}
                      </Badge>
                    ) : null}
                    {isAdmin && s !== "devolvido" && s !== "aguardando" ? (
                      <Button size="sm" variant="ghost" onClick={() => setEntregaDe(l)}>
                        <PackageCheck size={12} /> Entrega
                      </Button>
                    ) : null}
                    {valor > 0 ? (
                      <Button size="sm" variant={pago ? "ghost" : "soft"} onClick={() => setPagarDe(l)}>
                        <Wallet size={12} /> {isAdmin && !pago ? "Pagar" : "Ver"}
                      </Button>
                    ) : null}
                  </div>
                </Td>,
                ].filter(Boolean)}
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <Empty title="Nenhum serviço neste filtro" />
      )}

      {entregaDe ? <EntregaModal linha={entregaDe} onClose={() => setEntregaDe(null)} /> : null}
      {pagarDe ? (
        <Modal open title={`Pagamento · ${pagarDe.op.numero} · ${pagarDe.micro.nome}`} onClose={() => setPagarDe(null)}>
          <AcertoControls
            terceirizadoId={pagarDe.terceirizadoId}
            opId={pagarDe.op.id}
            microId={pagarDe.micro.id}
            valorOriginal={valorMicroTerceirizado(pagarDe.op, pagarDe.micro, state.terceirizados)}
          />
          <div className="mt-3 flex justify-between gap-2">
            <Link href={`/terceirizados/${pagarDe.terceirizadoId}`} className="text-[12px] text-sky hover:underline">
              Abrir parceiro
            </Link>
            <Button variant="ghost" onClick={() => setPagarDe(null)}>Fechar</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function EntregaModal({ linha, onClose }: { linha: Linha; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const op = state.ops.find((o) => o.id === linha.op.id) ?? linha.op;
  const micro = op.micros.find((m) => m.id === linha.micro.id) ?? linha.micro;
  const dev = devolvidoMicro(micro);
  const pend = Math.max(0, (micro.quantidade || 0) - dev);
  const [qtd, setQtd] = useState(String(pend));
  const [data, setData] = useState(todayISO());
  const [nota, setNota] = useState("");
  const [concluir, setConcluir] = useState(true);

  return (
    <Modal open title={`Entrega · ${op.numero} · ${micro.nome}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Math.min(pend, Math.floor(Number(qtd) || 0));
          if (n <= 0) return;
          dispatch({ type: "REGISTRAR_ENTREGA", opId: op.id, microId: micro.id, quantidade: n, data, nota: nota.trim() || undefined });
          if (concluir && n >= pend && micro.status !== "concluida") {
            dispatch({ type: "MICRO_ACTION", opId: op.id, microId: micro.id, status: "concluida" });
          }
          onClose();
        }}
      >
        <p className="text-[13px] text-mute">
          Enviado {nInt.format(micro.quantidade || 0)} pç · voltou {nInt.format(dev)} · com o terceirizado{" "}
          <span className="text-ink">{nInt.format(pend)}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Peças que chegaram">
            <Input type="number" min={1} max={pend} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Field>
          <Field label="Data da entrega">
            <DateInput value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Observação" hint="Opcional — ex.: quais partes chegaram">
              <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: tamanhos P e M" />
            </Field>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={concluir} onChange={(e) => setConcluir(e.target.checked)} />
          Concluir a etapa quando todas as peças voltarem
        </label>
        {micro.entregas?.length ? (
          <ul className="divide-y divide-line rounded-md border border-line">
            {micro.entregas.map((en) => (
              <li key={en.id} className="flex items-center gap-2 px-3 py-1.5 text-[12px]">
                <span className="tabular-nums">{formatDate(en.data)}</span>
                <span className="tabular-nums text-ink">{nInt.format(en.quantidade)} pç</span>
                <span className="min-w-0 flex-1 truncate text-faint">{en.nota ?? ""}</span>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                  aria-label="Remover entrega"
                  onClick={() => dispatch({ type: "REMOVER_ENTREGA", opId: op.id, microId: micro.id, entregaId: en.id })}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={pend <= 0}>Registrar entrega</Button>
        </div>
      </form>
    </Modal>
  );
}
