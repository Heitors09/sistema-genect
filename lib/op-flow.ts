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

const FAMILY_COLORS = ["#9b8ec4", "#7ea2d6", "#7dba8a", "#d4b56a", "#d97a86"];

export function familyColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return FAMILY_COLORS[h % FAMILY_COLORS.length];
}

export function opFamily(op: OrdemProducao, ops: OrdemProducao[]) {
  const parent = op.parentOpId ? ops.find((o) => o.id === op.parentOpId) : undefined;
  const children = ops.filter((o) => o.parentOpId === op.id && o.status !== "cancelada");
  if (!parent && children.length === 0) return null;
  const rootId = parent?.id ?? op.id;
  const label = parent
    ? `filha de ${parent.numero}`
    : children.length === 1
      ? `mãe de ${children[0].numero}`
      : `mãe · ${children.length} filhas`;
  return { rootId, color: familyColor(rootId), parent, children, label };
}

export function sortFamilyFirst(all: OrdemProducao[], column: OrdemProducao[]) {
  return [...column].sort((a, b) => {
    const fa = opFamily(a, all) ? 0 : 1;
    const fb = opFamily(b, all) ? 0 : 1;
    return fa - fb;
  });
}
