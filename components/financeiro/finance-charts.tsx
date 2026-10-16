"use client";

import { cn } from "@/components/ui";
import { brl } from "@/lib/format";

export function BarChartMensal({
  items,
  highlight,
}: {
  items: { label: string; valor: number }[];
  highlight?: string;
}) {
  const max = Math.max(...items.map((i) => i.valor), 1);
  return (
    <div className="flex h-52 items-end gap-2 px-1">
      {items.map((item) => {
        const h = Math.max(8, Math.round((item.valor / max) * 100));
        const active = highlight ? item.label === highlight : item.valor === max;
        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="relative flex h-40 w-full items-end justify-center">
              {active && item.valor > 0 ? (
                <span className="absolute -top-0.5 z-10 rounded bg-elevated px-1 py-0.5 text-[10px] font-medium tabular-nums text-ink shadow-sm">
                  {brl.format(item.valor)}
                </span>
              ) : null}
              <div
                className={cn(
                  "w-[72%] max-w-12 rounded-t-xl transition-all",
                  active ? "bg-ink" : "bg-elevated",
                )}
                style={{ height: `${h}%` }}
                title={brl.format(item.valor)}
              />
            </div>
            <span className="text-[11px] text-mute">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DespesaBreakdown({
  items,
}: {
  items: { label: string; valor: number; pct: number }[];
}) {
  if (!items.length) {
    return <p className="text-[13px] text-faint">Sem despesas nesta competência.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-mute">{item.label}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tabular-nums tracking-tight text-ink">
                {brl.format(item.valor)}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium tabular-nums",
                  item.pct > 0 ? "text-rose" : item.pct < 0 ? "text-mint" : "text-faint",
                )}
              >
                {item.pct > 0 ? "▲" : item.pct < 0 ? "▼" : "·"} {Math.abs(item.pct).toFixed(1)}%
              </span>
            </div>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-well"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, var(--line) 2px, var(--line) 3px)`,
            }}
          >
            <div
              className={cn("h-full rounded-full", item.pct >= 0 ? "bg-rose/45" : "bg-mint/45")}
              style={{ width: `${Math.min(Math.abs(item.pct), 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
