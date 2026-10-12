import { uid } from "./format";
import type { MicroEtapa, RoteiroAresta, RoteiroEtapaDef, RoteiroModelo } from "./types";
import { runsRoteiro } from "./roteiro-path";

const COL_W = 220;
const ROW_H = 110;
const ORIGIN_X = 48;
const ORIGIN_Y = 40;

export function arestasFromLinear(etapas: { id: string; altGroup?: string }[]): RoteiroAresta[] {
  const runs = runsRoteiro(etapas);
  const arestas: RoteiroAresta[] = [];
  let prevIds: string[] = [];
  for (const run of runs) {
    const curIds = run.map((r) => r.id);
    if (!prevIds.length) {
      prevIds = curIds;
      continue;
    }
    const kind = run.length > 1 || prevIds.length > 1 ? ("bifurcacao" as const) : ("sequencia" as const);
    for (const fromId of prevIds) {
      for (const toId of curIds) {
        arestas.push({
          id: uid("rae"),
          fromId,
          toId,
          kind,
          label: kind === "bifurcacao" ? "ou" : undefined,
        });
      }
    }
    prevIds = curIds;
  }
  return arestas;
}

export function ensureRoteiroGraph(roteiro: RoteiroModelo): RoteiroModelo {
  const etapas = roteiro.etapas ?? [];
  const arestas =
    roteiro.arestas?.length && roteiro.arestas.every((a) => a.fromId && a.toId)
      ? roteiro.arestas
      : arestasFromLinear(etapas);
  const laid = layoutNodes(etapas, arestas, roteiro.inicioId ?? etapas[0]?.id);
  return {
    ...roteiro,
    etapas: laid,
    arestas,
    inicioId: roteiro.inicioId ?? etapas[0]?.id,
  };
}

export function layoutNodes<T extends { id: string; x?: number; y?: number }>(
  nodes: T[],
  arestas: RoteiroAresta[],
  inicioId?: string,
): T[] {
  if (!nodes.length) return nodes;
  const start = inicioId && nodes.some((n) => n.id === inicioId) ? inicioId : nodes[0]!.id;
  const outs = new Map<string, string[]>();
  for (const a of arestas) {
    const list = outs.get(a.fromId) ?? [];
    list.push(a.toId);
    outs.set(a.fromId, list);
  }
  const depth = new Map<string, number>();
  const lane = new Map<string, number>();
  const laneCount = new Map<number, number>();
  const q = [start];
  depth.set(start, 0);
  while (q.length) {
    const id = q.shift()!;
    const d = depth.get(id) ?? 0;
    if (!lane.has(id)) {
      const row = laneCount.get(d) ?? 0;
      lane.set(id, row);
      laneCount.set(d, row + 1);
    }
    for (const next of outs.get(id) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        q.push(next);
      }
    }
  }
  let orphanCol = (Math.max(0, ...depth.values()) || 0) + 1;
  return nodes.map((n) => {
    if (n.x != null && n.y != null) return n;
    const d = depth.get(n.id);
    if (d == null) {
      const col = orphanCol++;
      return { ...n, x: ORIGIN_X + col * COL_W, y: ORIGIN_Y };
    }
    return {
      ...n,
      x: ORIGIN_X + d * COL_W,
      y: ORIGIN_Y + (lane.get(n.id) ?? 0) * ROW_H,
    };
  });
}

export function sucessores(arestas: RoteiroAresta[], nodeId: string) {
  return arestas.filter((a) => a.fromId === nodeId);
}

export function alcancaveis(arestas: RoteiroAresta[], fromId: string): Set<string> {
  const out = new Set<string>();
  const q = [fromId];
  while (q.length) {
    const id = q.shift()!;
    if (out.has(id)) continue;
    out.add(id);
    for (const a of sucessores(arestas, id)) q.push(a.toId);
  }
  return out;
}

/** Ramo da filha: nó atual + destino escolhido + tudo à frente do destino (sem irmãos do fork). */
export function ramoFilha(
  nodeIds: string[],
  arestas: RoteiroAresta[],
  fromId: string,
  nextId: string,
): { nodes: string[]; arestas: RoteiroAresta[] } {
  const keep = new Set<string>([fromId, nextId, ...alcancaveis(arestas, nextId)]);
  keep.delete(fromId);
  keep.add(fromId);
  keep.add(nextId);
  const ids = nodeIds.filter((id) => keep.has(id));
  const edges = arestas.filter(
    (a) =>
      keep.has(a.fromId) &&
      keep.has(a.toId) &&
      !(a.fromId === fromId && a.toId !== nextId),
  );
  return { nodes: ids, arestas: edges };
}

export function resumoGrafo(etapas: { id: string; nome: string }[], arestas: RoteiroAresta[]) {
  if (!etapas.length) return "—";
  const forks = new Set(arestas.filter((a) => a.kind === "bifurcacao" || a.kind === "filha").map((a) => a.fromId));
  if (!forks.size && arestas.length === Math.max(0, etapas.length - 1)) {
    return etapas.map((e) => e.nome).join(" → ");
  }
  return `${etapas.length} etapas · ${forks.size || contagemBifurcacoes(arestas)} bifurcações`;
}

function contagemBifurcacoes(arestas: RoteiroAresta[]) {
  const out = new Map<string, number>();
  for (const a of arestas) out.set(a.fromId, (out.get(a.fromId) ?? 0) + 1);
  return [...out.values()].filter((n) => n > 1).length;
}

export function microsComGrafo(
  etapas: RoteiroEtapaDef[],
  arestas: RoteiroAresta[] | undefined,
  quantidade: number,
  opts?: {
    existing?: MicroEtapa[];
    terceirizadoId?: string;
    servicoId?: string;
  },
): { micros: MicroEtapa[]; microArestas: RoteiroAresta[]; microAtualId?: string } {
  const graph = arestas?.length ? arestas : arestasFromLinear(etapas);
  const laid = layoutNodes(etapas, graph, etapas[0]?.id);
  const idMap = new Map<string, string>();
  const micros: MicroEtapa[] = laid.map((etapa, index) => {
    const prev = opts?.existing?.find((m) => m.id === etapa.id);
    const id = prev?.id ?? uid("mic");
    idMap.set(etapa.id, id);
    return {
      id,
      nome: etapa.nome,
      macroId: etapa.macroId,
      quantidade,
      status: prev?.status ?? (index === 0 ? ("em_andamento" as const) : ("aguardando" as const)),
      iniciadaEm: prev?.iniciadaEm ?? (index === 0 ? new Date().toISOString() : undefined),
      concluidaEm: prev?.concluidaEm,
      terceirizadoId: etapa.terceirizado ? (etapa.terceirizadoId ?? opts?.terceirizadoId) : undefined,
      servicoId: etapa.terceirizado ? (etapa.servicoId ?? opts?.servicoId) : undefined,
      altGroup: etapa.altGroup,
      x: etapa.x,
      y: etapa.y,
    };
  });
  const microArestas = graph.map((a) => ({
    ...a,
    id: uid("rae"),
    fromId: idMap.get(a.fromId) ?? a.fromId,
    toId: idMap.get(a.toId) ?? a.toId,
  }));
  const microAtualId =
    micros.find((m) => m.status === "em_andamento")?.id ?? micros[0]?.id;
  return { micros, microArestas, microAtualId };
}

export function ensureOpMicroGraph(op: {
  micros: MicroEtapa[];
  microArestas?: RoteiroAresta[];
  microAtualId?: string;
}) {
  const arestas =
    op.microArestas?.length ? op.microArestas : arestasFromLinear(op.micros);
  const micros = layoutNodes(op.micros, arestas, op.microAtualId ?? op.micros[0]?.id);
  const microAtualId =
    op.microAtualId && micros.some((m) => m.id === op.microAtualId)
      ? op.microAtualId
      : micros.find((m) => m.status === "em_andamento")?.id ?? micros[0]?.id;
  return { micros, microArestas: arestas, microAtualId };
}

export function proximoPorAresta(
  micros: MicroEtapa[],
  arestas: RoteiroAresta[],
  doneId: string,
): MicroEtapa | undefined {
  const outs = sucessores(arestas, doneId);
  if (!outs.length) {
    const idx = micros.findIndex((m) => m.id === doneId);
    return micros.slice(idx + 1).find((m) => m.status === "aguardando");
  }
  for (const edge of outs) {
    const m = micros.find((x) => x.id === edge.toId && x.status === "aguardando");
    if (m) return m;
  }
  for (const edge of outs) {
    const m = micros.find((x) => x.id === edge.toId && x.status !== "concluida");
    if (m) return m;
  }
  return undefined;
}
