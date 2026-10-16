"use client";

import { useState } from "react";
import { acertoStatusLabel, brl, todayISO, uid } from "@/lib/format";
import { appendLancamento, totaisAcerto } from "@/lib/terceirizado-ops";
import type { AcertoLancamentoTipo, AcertoTerceirizado } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Badge, Button, Field, Input, cn } from "../ui";

export function AcertoControls({
  terceirizadoId,
  opId,
  microId,
  valorOriginal,
}: {
  terceirizadoId: string;
  opId: string;
  microId: string;
  valorOriginal: number;
}) {
  const { state, dispatch, isAdmin } = useStore();
  const existing = state.acertosTerceirizado.find(
    (a) => a.terceirizadoId === terceirizadoId && a.opId === opId && a.microId === microId,
  );

  const syncValor: AcertoTerceirizado = {
    id: existing?.id ?? "",
    terceirizadoId,
    opId,
    microId,
    modo: existing?.modo ?? "partes",
    status: existing?.status ?? "pendente",
    valorOriginal,
    desconto: existing?.desconto ?? 0,
    pago: existing?.pago ?? 0,
    lancamentos: existing?.lancamentos ?? [],
    observacao: existing?.observacao,
    updatedAt: existing?.updatedAt ?? new Date().toISOString(),
  };
  const totais = totaisAcerto(syncValor);
  const [valorInput, setValorInput] = useState("");
  const [tipo, setTipo] = useState<AcertoLancamentoTipo>("pagamento");

  function save(next: AcertoTerceirizado) {
    dispatch({
      type: "SAVE_ACERTO_TERCEIRIZADO",
      acerto: {
        ...next,
        id: next.id || uid("act"),
        valorOriginal,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  function lancar() {
    const valor = Number(valorInput);
    if (!Number.isFinite(valor) || valor <= 0) return;
    const capped =
      tipo === "pagamento"
        ? Math.min(valor, totais.restante > 0 ? totais.restante : valor)
        : Math.min(valor, Math.max(0, valorOriginal - totais.desconto));
    if (capped <= 0) return;

    const next = appendLancamento(syncValor, {
      id: uid("acl"),
      tipo,
      valor: Number(capped.toFixed(2)),
      data: todayISO(),
    });
    save(next);
    setValorInput("");
  }

  const status =
    totais.restante <= 0 && (totais.pago > 0 || totais.desconto > 0 || valorOriginal <= 0)
      ? "pago"
      : totais.pago > 0 || totais.desconto > 0
        ? "pagando"
        : syncValor.status === "pago"
          ? "pago"
          : syncValor.status;
  const lancamentos = [...(syncValor.lancamentos ?? [])].reverse();

  if (!isAdmin) {
    return (
      <div className="space-y-2 rounded-md border border-line bg-elevated/30 p-2.5">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <Badge
            tone={status === "pago" ? "mint" : status === "pagando" ? "amber" : "mute"}
          >
            {acertoStatusLabel[status]}
          </Badge>
          <span className="tabular-nums text-mute">
            Restante {brl.format(totais.restante)}
          </span>
        </div>
        {lancamentos.length ? <Ledger lancamentos={lancamentos} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 rounded-md border border-line bg-elevated/30 p-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-faint">Saldo</p>
          <p
            className={cn(
              "stat-value text-[18px] tabular-nums",
              status === "pago" ? "text-mint" : "text-ink",
            )}
          >
            {status === "pago" ? "Pago" : brl.format(totais.restante)}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            Original {brl.format(valorOriginal)}
            {totais.desconto > 0 ? ` · desc. ${brl.format(totais.desconto)}` : ""}
            {totais.pago > 0 ? ` · pago ${brl.format(totais.pago)}` : ""}
          </p>
        </div>
        <Badge tone={status === "pago" ? "mint" : status === "pagando" ? "amber" : "mute"}>
          {acertoStatusLabel[status]}
        </Badge>
      </div>

      {status !== "pago" ? (
        <div className="space-y-2">
          <div className="flex h-8 overflow-hidden rounded-md border border-line">
            <button
              type="button"
              className={cn(
                "flex-1 text-[11px] transition-colors",
                tipo === "pagamento"
                  ? "bg-mint/15 text-mint"
                  : "text-mute hover:bg-elevated/60",
              )}
              onClick={() => setTipo("pagamento")}
            >
              Pagamento
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 border-l border-line text-[11px] transition-colors",
                tipo === "desconto"
                  ? "bg-rose/12 text-rose"
                  : "text-mute hover:bg-elevated/60",
              )}
              onClick={() => setTipo("desconto")}
            >
              Desconto
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1">
              <Field label={tipo === "pagamento" ? "Valor pago" : "Valor do desconto"}>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  placeholder="0,00"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      lancar();
                    }
                  }}
                />
              </Field>
            </div>
            <Button
              type="button"
              size="sm"
              variant={tipo === "desconto" ? "danger" : "soft"}
              disabled={!Number(valorInput) || Number(valorInput) <= 0}
              onClick={lancar}
            >
              {tipo === "pagamento" ? "Registrar" : "Descontar"}
            </Button>
          </div>
        </div>
      ) : null}

      <Ledger lancamentos={lancamentos} />
    </div>
  );
}

function Ledger({
  lancamentos,
}: {
  lancamentos: { id: string; tipo: AcertoLancamentoTipo; valor: number; data: string }[];
}) {
  if (!lancamentos.length) {
    return <p className="text-[11px] text-faint">Sem lançamentos ainda.</p>;
  }

  return (
    <ul className="divide-y divide-line/80 overflow-hidden rounded-md border border-line bg-surface/60">
      {lancamentos.map((l) => {
        const pagamento = l.tipo === "pagamento";
        return (
          <li
            key={l.id}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12px] tabular-nums"
          >
            <span className="text-faint">{l.data}</span>
            <span className={cn("font-medium", pagamento ? "text-mint" : "text-rose")}>
              {pagamento ? "+" : "−"}
              {brl.format(l.valor)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
