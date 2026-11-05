"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { brl } from "@/lib/format";

/*
 * Gráficos do fluxo de caixa (SVG puro).
 * Cores: azul (--sky) = crédito / realizado; âmbar (--amber) = débito / previsto.
 * Par validado para daltonismo (ΔE ≥ 17); previsto ainda leva traço pontilhado
 * e legenda, então a identidade nunca depende só da cor.
 */

const PAD = { top: 12, right: 12, bottom: 24, left: 64 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setW(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    max = min + 1;
    min = Math.min(0, min - 1);
  }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(2)));
  return { lo, hi, ticks };
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

function dm(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

export type Serie = { id: string; label: string; values: number[]; color: string; dashed?: boolean };

function Legenda({ series }: { series: { label: string; color: string; dashed?: boolean; bar?: boolean }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          {s.bar ? (
            <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
          ) : (
            <svg width="18" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="18"
                y2="3"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dashed ? "4 3" : undefined}
              />
            </svg>
          )}
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(8, x + 12), Math.max(8, width - 196));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 w-[184px] rounded-md border border-line-strong bg-popover px-2.5 py-2 text-[11px] shadow-[0_12px_28px_rgb(0_0_0_/_0.18)]"
      style={{ left }}
    >
      {children}
    </div>
  );
}

function Grid({
  ticks,
  y,
  width,
}: {
  ticks: number[];
  y: (v: number) => number;
  width: number;
}) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke={t === 0 ? "var(--line-strong)" : "var(--line)"}
            strokeWidth={t === 0 ? 1.25 : 1}
            strokeDasharray={t === 0 ? undefined : "2 4"}
          />
          <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10" fill="var(--faint)">
            {compact.format(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

function EixoX({ dias, x, height }: { dias: string[]; x: (i: number) => number; height: number }) {
  const every = Math.max(1, Math.ceil(dias.length / 8));
  return (
    <g>
      {dias.map((d, i) =>
        (i % every === 0 && dias.length - 1 - i >= Math.ceil(every / 2)) || i === dias.length - 1 ? (
          <text key={d} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--faint)">
            {dm(d)}
          </text>
        ) : null,
      )}
    </g>
  );
}

/** Linhas (ex.: saldo acumulado; previsto × realizado). Uma única escala Y. */
export function LinhaChart({
  dias,
  series,
  height = 220,
  ariaLabel,
}: {
  dias: string[];
  series: Serie[];
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap((s) => s.values);
  const { lo, hi, ticks } = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const iw = Math.max(1, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (dias.length <= 1 ? iw / 2 : (i / (dias.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo || 1)) * ih;

  function onMove(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left - PAD.left;
    const i = Math.round((px / iw) * (dias.length - 1));
    setHover(Math.min(dias.length - 1, Math.max(0, i)));
  }

  return (
    <div>
      {series.length > 1 ? <Legenda series={series} /> : null}
      <div ref={ref} className="relative w-full">
        {width > 0 && dias.length ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setHover(null)}
            onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
            onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect())}
          >
            <Grid ticks={ticks} y={y} width={width} />
            <EixoX dias={dias} x={x} height={height} />
            {series.map((s) => (
              <polyline
                key={s.id}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "5 4" : undefined}
                points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              />
            ))}
            {/* rótulo direto só no último ponto */}
            {series.map((s) => {
              const last = s.values.length - 1;
              if (last < 0) return null;
              return (
                <circle
                  key={`${s.id}-end`}
                  cx={x(last)}
                  cy={y(s.values[last])}
                  r={4}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              );
            })}
            {hover !== null ? (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--line-strong)" strokeWidth={1} />
                {series.map((s) => (
                  <circle
                    key={s.id}
                    cx={x(hover)}
                    cy={y(s.values[hover])}
                    r={4.5}
                    fill={s.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {hover !== null && width > 0 ? (
          <Tooltip x={x(hover)} width={width}>
            <p className="mb-1 font-medium text-ink">{dm(dias[hover])}</p>
            {series.map((s) => (
              <p key={s.id} className="flex items-center justify-between gap-2 text-mute">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums text-ink">{brl.format(s.values[hover])}</span>
              </p>
            ))}
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

/** Movimento diário: crédito para cima, débito para baixo da linha zero. */
export function MovimentoChart({
  dias,
  credito,
  debito,
  height = 200,
  onSelect,
}: {
  dias: string[];
  credito: number[];
  debito: number[];
  height?: number;
  onSelect?: (dia: string) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { lo, hi, ticks } = niceTicks(-Math.max(0, ...debito), Math.max(0, ...credito));
  const iw = Math.max(1, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const slot = iw / Math.max(1, dias.length);
  const bw = Math.max(2, Math.min(18, slot - 2));
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + ih - ((v - lo) / (hi - lo || 1)) * ih;
  const y0 = y(0);

  /** Barra com só a ponta arredondada (4px), presa à linha zero. */
  function bar(cx: number, v: number, up: boolean) {
    const h = Math.abs(y(v) - y0);
    if (h < 0.5) return "";
    const r = Math.min(4, h, bw / 2);
    const l = cx - bw / 2;
    const rr = cx + bw / 2;
    if (up) {
      const t = y0 - h;
      return `M${l},${y0} V${t + r} Q${l},${t} ${l + r},${t} H${rr - r} Q${rr},${t} ${rr},${t + r} V${y0} Z`;
    }
    const b = y0 + h;
    return `M${l},${y0} V${b - r} Q${l},${b} ${l + r},${b} H${rr - r} Q${rr},${b} ${rr},${b - r} V${y0} Z`;
  }

  return (
    <div>
      <Legenda
        series={[
          { label: "Crédito (receitas)", color: "var(--sky)", bar: true },
          { label: "Débito (despesas)", color: "var(--amber)", bar: true },
        ]}
      />
      <div ref={ref} className="relative w-full">
        {width > 0 && dias.length ? (
          <svg width={width} height={height} role="img" aria-label="Crédito e débito por dia" onMouseLeave={() => setHover(null)}>
            <Grid ticks={ticks} y={y} width={width} />
            <EixoX dias={dias} x={x} height={height} />
            {dias.map((d, i) => (
              <g key={d}>
                <path d={bar(x(i), credito[i], true)} fill="var(--sky)" opacity={hover === null || hover === i ? 1 : 0.55} />
                <path d={bar(x(i), -debito[i], false)} fill="var(--amber)" opacity={hover === null || hover === i ? 1 : 0.55} />
                {/* área de toque maior que a barra */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={ih}
                  fill="transparent"
                  className={onSelect ? "cursor-pointer" : undefined}
                  onMouseEnter={() => setHover(i)}
                  onTouchStart={() => setHover(i)}
                  onClick={() => onSelect?.(d)}
                />
              </g>
            ))}
          </svg>
        ) : (
          <div style={{ height }} />
        )}
        {hover !== null && width > 0 ? (
          <Tooltip x={x(hover)} width={width}>
            <p className="mb-1 font-medium text-ink">{dm(dias[hover])}</p>
            <p className="flex justify-between gap-2 text-mute">
              Crédito <span className="tabular-nums text-ink">{brl.format(credito[hover])}</span>
            </p>
            <p className="flex justify-between gap-2 text-mute">
              Débito <span className="tabular-nums text-ink">{brl.format(debito[hover])}</span>
            </p>
            <p className="mt-1 flex justify-between gap-2 border-t border-line pt-1 text-mute">
              Saldo do dia <span className="tabular-nums text-ink">{brl.format(credito[hover] - debito[hover])}</span>
            </p>
            {onSelect ? <p className="mt-1 text-faint">Clique para detalhar</p> : null}
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
