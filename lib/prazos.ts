import { todayISO } from "./format";
import type { MicroEtapa, OrdemProducao } from "./types";

export const PRAZO_OP_DIAS_UTEIS = 20;
export const PRAZO_MICRO_DIAS_UTEIS = 5;

export const MACRO_STAGES = [
  { id: "st-recebimento", kind: "recebimento" as const, label: "Recebimento" },
  { id: "st-corte", kind: "corte" as const, label: "Corte" },
  { id: "st-costura", kind: "costura" as const, label: "Costura" },
  { id: "st-acabamento", kind: "acabamento" as const, label: "Acabamento" },
  { id: "st-revisao", kind: "revisao" as const, label: "Revisão" },
  { id: "st-expedicao", kind: "expedicao" as const, label: "Expedição" },
];

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d;
}

export function addBusinessDays(iso: string, days: number) {
  const d = shiftDate(iso, 0);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const weekday = d.getDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return d.toISOString().slice(0, 10);
}

export function isWeekend(iso: string) {
  const weekday = shiftDate(iso, 0).getDay();
  return weekday === 0 || weekday === 6;
}

export function opPrazoLimite(op: Pick<OrdemProducao, "dataEntrada">) {
  return addBusinessDays(op.dataEntrada, PRAZO_OP_DIAS_UTEIS);
}

export function opAtrasada(op: OrdemProducao) {
  if (op.status === "finalizada" || op.status === "cancelada") return false;
  return todayISO() > opPrazoLimite(op);
}

export function microPrazoLimite(micro: MicroEtapa) {
  const start = micro.iniciadaEm?.slice(0, 10) ?? todayISO();
  return addBusinessDays(start, PRAZO_MICRO_DIAS_UTEIS);
}

export function microAtrasada(micro: MicroEtapa) {
  if (micro.status === "concluida") return false;
  if (!micro.iniciadaEm) return false;
  return todayISO() > microPrazoLimite(micro);
}
