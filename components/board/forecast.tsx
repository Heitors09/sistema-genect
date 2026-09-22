"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store/store";

export function ForecastBar() {
  const { state } = useStore();
  const ativas = state.ops.filter((o) => o.status !== "cancelada" && o.status !== "finalizada");
  const planejado = ativas.reduce((a, o) => a + o.quantidade, 0);
  const produzido = ativas.reduce((a, o) => a + o.quantidadeProduzida, 0);
  const perdas = ativas.reduce((a, o) => a + o.perdas + o.refugo, 0);
  const pct = planejado ? Math.round((produzido / planejado) * 100) : 0;
  const rate = 165;
  const restante = Math.max(0, planejado - produzido);
  const hours = restante / rate;
  const [etaLabel, setEtaLabel] = useState("--:--");

  useEffect(() => {
    const eta = new Date(Date.now() + hours * 3600 * 1000);
    setEtaLabel(
      eta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    );
  }, [hours]);

  const spark = [42, 55, 48, 62, 70, 66, 78, 74, 81, pct];
  const points = spark
    .map((v, i) => `${(i / (spark.length - 1)) * 120},${36 - (v / 100) * 32}`)
    .join(" ");

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <ForecastStat label="OPs em andamento" value={String(ativas.length)} hint="Kanban do dia" />
      <ForecastStat
        label="Peças planejadas"
        value={planejado.toLocaleString("pt-BR")}
        hint={`${produzido.toLocaleString("pt-BR")} produzidas`}
      />
      <ForecastStat
        label="Previsão de conclusão"
        value={etaLabel}
        hint={`${restante.toLocaleString("pt-BR")} pç restantes · ${rate} pç/h`}
      />
      <div className="surface rounded-md px-4 py-3.5">
        <div className="flex items-center justify-between">
          <p className="kicker">Ritmo do dia</p>
          <p className="text-[13px] font-semibold tabular-nums text-mint">{pct}%</p>
        </div>
        <svg viewBox="0 0 120 36" className="mt-3 h-9 w-full" aria-hidden>
          <title>Ritmo do dia</title>
          <polyline
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
        <p className="mt-1.5 text-[11px] text-faint">{perdas} pç em perda/refugo</p>
      </div>
    </div>
  );
}

function ForecastStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface rounded-md px-3 py-3 md:px-4 md:py-3.5">
      <p className="kicker">{label}</p>
      <p className="stat-value mt-2 text-ink">{value}</p>
      <p className="mt-1.5 line-clamp-2 text-[11px] text-faint">{hint}</p>
    </div>
  );
}
