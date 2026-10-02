"use client";

import { brl, nInt } from "@/lib/format";
import type { LinhaValorServico } from "@/lib/migrate";
import { cn } from "../ui";

export function ValorServicoResumo({
  pecas,
  linhas,
  total,
}: {
  pecas: number;
  linhas: LinhaValorServico[];
  total: number;
}) {
  const principais = linhas.filter((l) => !l.alternativa);
  const pendente = principais.find((l) => l.pendente);

  return (
    <div className="surface rounded-md p-4">
      <p className="kicker">Valor do serviço</p>
      <p className="stat-value mt-2">{brl.format(total || 0)}</p>
      <p className="mt-1 text-[11px] text-faint">
        {pecas > 0
          ? `${nInt.format(pecas)} peça${pecas === 1 ? "" : "s"} × valor cadastrado do serviço`
          : "Informe a quantidade de peças da OP"}
      </p>

      {linhas.length ? (
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {linhas.map((linha) => (
            <li key={linha.id} className={cn("text-[12px]", linha.alternativa && "pl-3")}>
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                  <span className="block text-ink">
                    {linha.alternativa ? "ou " : ""}
                    {linha.servicoNome}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-faint">{linha.terceirizadoNome}</span>
                </span>
                <span className={cn("shrink-0 tabular-nums", linha.alternativa ? "text-faint" : "text-ink")}>
                  {linha.pendente ? "—" : brl.format(linha.total)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-faint">
                {linha.pendente === "terceirizado"
                  ? "Escolha o terceirizado no roteiro"
                  : linha.pendente === "servico"
                    ? "Escolha o serviço no roteiro"
                    : linha.pendente === "valor"
                      ? "Cadastre o valor por peça no terceirizado"
                      : `${nInt.format(linha.pecas)} pç × ${brl.format(linha.valorPorPeca)}`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12px] text-faint">Inclua um terceirizado no roteiro para prever o custo.</p>
      )}

      {pendente && pecas > 0 && !total ? (
        <p className="mt-2 text-[11px] text-amber">O total só fecha quando cada serviço tiver valor cadastrado.</p>
      ) : null}
    </div>
  );
}
