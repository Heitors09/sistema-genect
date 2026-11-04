"use client";

import { Trash2 } from "lucide-react";
import { brl } from "@/lib/format";
import { gerarParcelas, somaParcelas } from "@/lib/financeiro";
import type { ParcelaPrevista } from "@/lib/types";
import { Button, DateInput, Field, Input, cn } from "../ui";

/**
 * Edita parcelas: gera N parcelas iguais a partir do 1º vencimento e permite
 * ajustar data e valor de cada uma (ex.: 2 × R$ 500,00).
 */
export function ParcelasEditor({
  total,
  primeiroVencimento,
  value,
  onChange,
  intervaloDias,
}: {
  total: number;
  primeiroVencimento: string;
  value: ParcelaPrevista[];
  onChange: (next: ParcelaPrevista[]) => void;
  /** Sem valor = mensal (mesmo dia). */
  intervaloDias?: number;
}) {
  const soma = somaParcelas(value);
  const diff = Number((total - soma).toFixed(2));

  function regenerar(n: number) {
    onChange(gerarParcelas(total, n, primeiroVencimento, intervaloDias));
  }

  function patch(id: string, p: Partial<ParcelaPrevista>) {
    onChange(value.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <Field label="Nº de parcelas">
            <Input
              type="number"
              min={1}
              max={48}
              value={value.length || 1}
              onChange={(e) => regenerar(Math.min(48, Math.max(1, Number(e.target.value) || 1)))}
            />
          </Field>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => regenerar(value.length || 1)}>
          Redistribuir valores
        </Button>
      </div>
      <ul className="space-y-1.5">
        {value.map((p) => (
          <li key={p.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <span className="text-[12px] tabular-nums text-mute">
              {p.numero}/{value.length}
            </span>
            <DateInput
              value={p.vencimento}
              onChange={(e) => patch(p.id, { vencimento: e.target.value })}
            />
            <Input
              type="number"
              step="0.01"
              min={0}
              value={String(p.valor)}
              onChange={(e) => patch(p.id, { valor: Number(e.target.value) || 0 })}
              aria-label={`Valor da parcela ${p.numero}`}
            />
            <button
              type="button"
              disabled={value.length <= 1}
              className="grid h-9 w-9 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose disabled:opacity-30"
              aria-label="Remover parcela"
              onClick={() =>
                onChange(
                  value
                    .filter((x) => x.id !== p.id)
                    .map((x, i) => ({ ...x, numero: i + 1 })),
                )
              }
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      <p className={cn("text-[11px] tabular-nums", diff !== 0 ? "text-amber" : "text-faint")}>
        Soma das parcelas {brl.format(soma)} · total {brl.format(total)}
        {diff !== 0 ? ` · diferença ${brl.format(diff)}` : ""}
      </p>
    </div>
  );
}
