import type { OrdemProducao } from "./types";

export function activeAtados(op: OrdemProducao) {
  return op.atados.filter((a) => a.status !== "concluido");
}

export function opStageIds(op: OrdemProducao) {
  const open = activeAtados(op);
  if (open.length === 0) return [op.stageId];
  return [...new Set(open.map((a) => a.stageId))];
}

export function opIsInStage(op: OrdemProducao, stageId: string) {
  if (op.status === "cancelada") return false;
  const open = activeAtados(op);
  if (open.length === 0) return op.stageId === stageId;
  return open.some((a) => a.stageId === stageId);
}

export function pecasInStage(op: OrdemProducao, stageId: string) {
  const open = activeAtados(op);
  if (open.length === 0) return op.stageId === stageId ? op.quantidade : 0;
  return open.filter((a) => a.stageId === stageId).reduce((sum, a) => sum + a.quantidade, 0);
}

export function atadosInStage(op: OrdemProducao, stageId: string) {
  return activeAtados(op).filter((a) => a.stageId === stageId);
}

export function isSplitOp(op: OrdemProducao) {
  return opStageIds(op).length > 1;
}

export function opsInStage(ops: OrdemProducao[], stageId: string) {
  return ops.filter((op) => opIsInStage(op, stageId));
}

export function opStageLabels(op: OrdemProducao, labelOf: (id: string) => string | undefined) {
  return opStageIds(op)
    .map((id) => labelOf(id) ?? "—")
    .join(" + ");
}
