import type { MicroEtapa } from "./types";

/** Agrupa micros consecutivos com o mesmo altGroup. */
export function runsRoteiro<T extends { id: string; altGroup?: string }>(micros: T[]) {
  const runs: T[][] = [];
  for (const m of micros) {
    const last = runs[runs.length - 1];
    if (last?.length && m.altGroup && last[0]?.altGroup === m.altGroup) {
      last.push(m);
    } else {
      runs.push([m]);
    }
  }
  return runs;
}

/**
 * Resolve o micro-caminho linear a partir de um passo (bifurcação).
 * `escolhasAlt`: altGroup → microId escolhido nas alternativas à frente.
 */
export function caminhoAPartirDe(
  micros: MicroEtapa[],
  fromMicroId: string,
  escolhasAlt: Record<string, string> = {},
): MicroEtapa[] {
  const start = micros.findIndex((m) => m.id === fromMicroId);
  if (start < 0) return [];

  const out: MicroEtapa[] = [];
  let i = start;
  while (i < micros.length) {
    const cur = micros[i];
    if (!cur) break;
    const group = cur.altGroup;
    if (!group) {
      out.push(cur);
      i += 1;
      continue;
    }
    let j = i;
    const run: MicroEtapa[] = [];
    while (j < micros.length) {
      const step = micros[j];
      if (!step || step.altGroup !== group) break;
      run.push(step);
      j += 1;
    }
    let chosen: MicroEtapa | undefined;
    if (start >= i && start < j) {
      chosen = micros[start];
    } else {
      const pickId = escolhasAlt[group];
      chosen = run.find((m) => m.id === pickId) ?? run[0];
    }
    if (chosen) out.push(chosen);
    i = j;
  }
  return out;
}

/** Alternativas à frente do ponto de partida (ainda não decididas). */
export function escolhasAltAFrente(
  micros: MicroEtapa[],
  fromMicroId: string,
): { group: string; opcoes: MicroEtapa[] }[] {
  const start = micros.findIndex((m) => m.id === fromMicroId);
  if (start < 0) return [];

  const startGroup = micros[start]?.altGroup;
  let i = start;
  if (startGroup) {
    while (i < micros.length && micros[i]?.altGroup === startGroup) i += 1;
  } else {
    i = start + 1;
  }

  const out: { group: string; opcoes: MicroEtapa[] }[] = [];
  while (i < micros.length) {
    const cur = micros[i];
    if (!cur) break;
    if (!cur.altGroup) {
      i += 1;
      continue;
    }
    const group = cur.altGroup;
    const opcoes: MicroEtapa[] = [];
    while (i < micros.length) {
      const step = micros[i];
      if (!step || step.altGroup !== group) break;
      opcoes.push(step);
      i += 1;
    }
    if (opcoes.length > 1) out.push({ group, opcoes });
  }
  return out;
}

export function resumoMicroCaminho(micros: { nome: string }[]) {
  if (!micros.length) return "—";
  return micros.map((m) => m.nome).join(" → ");
}

/** Destinos seguintes após o passo atual (para preview “pra onde vai depois”). */
export function destinoDepois(caminho: { nome: string }[]) {
  if (caminho.length <= 1) return "fim do roteiro";
  return caminho.slice(1).map((m) => m.nome).join(" → ");
}
