import { linhasValorServico } from "./migrate";
import type {
  AcertoLancamento,
  AcertoTerceirizado,
  MicroEtapa,
  OrdemProducao,
  Terceirizado,
} from "./types";

export function opsDoTerceirizado(ops: OrdemProducao[], terceirizadoId: string) {
  return ops.filter(
    (o) =>
      o.status !== "cancelada" &&
      (o.terceirizadoIds.includes(terceirizadoId) ||
        o.micros.some((m) => m.terceirizadoId === terceirizadoId)),
  );
}

export function microsDoTerceirizado(op: OrdemProducao, terceirizadoId: string): MicroEtapa[] {
  return op.micros.filter((m) => m.terceirizadoId === terceirizadoId);
}

/** Todos os serviços deste parceiro na OP já foram concluídos → vai ao histórico. */
export function opConcluidaParaTerceirizado(op: OrdemProducao, terceirizadoId: string) {
  const micros = microsDoTerceirizado(op, terceirizadoId);
  if (!micros.length) return op.status === "finalizada";
  return micros.every((m) => m.status === "concluida");
}

export function opAtivaParaTerceirizado(op: OrdemProducao, terceirizadoId: string) {
  if (op.status === "cancelada") return false;
  return !opConcluidaParaTerceirizado(op, terceirizadoId);
}

/** @deprecated use opAtivaParaTerceirizado */
export function opAtiva(op: OrdemProducao) {
  return op.status !== "finalizada" && op.status !== "cancelada";
}

export function valorMicroTerceirizado(
  op: OrdemProducao,
  micro: MicroEtapa,
  terceirizados: Terceirizado[],
) {
  const pecas = micro.quantidade || op.quantidadeProduzida || op.quantidade;
  const { total } = linhasValorServico([micro], terceirizados, pecas);
  return total;
}

export function totaisAcerto(a: Pick<AcertoTerceirizado, "valorOriginal" | "lancamentos" | "desconto" | "pago">) {
  const lancamentos = a.lancamentos ?? [];
  const pagoLanc = lancamentos
    .filter((l) => l.tipo === "pagamento")
    .reduce((s, l) => s + l.valor, 0);
  const descLanc = lancamentos
    .filter((l) => l.tipo === "desconto")
    .reduce((s, l) => s + l.valor, 0);
  const desconto = Math.max(a.desconto || 0, descLanc);
  const pago = Math.max(a.pago || 0, pagoLanc);
  const liquido = Math.max(0, Number((a.valorOriginal - desconto).toFixed(2)));
  const restante = Math.max(0, Number((liquido - pago).toFixed(2)));
  return { desconto, pago, liquido, restante };
}

export function valorLiquidoAcerto(a: Pick<AcertoTerceirizado, "valorOriginal" | "desconto">) {
  return Math.max(0, Number((a.valorOriginal - (a.desconto || 0)).toFixed(2)));
}

export function findAcerto(
  acertos: AcertoTerceirizado[],
  terceirizadoId: string,
  opId: string,
  microId: string,
) {
  return acertos.find(
    (a) => a.terceirizadoId === terceirizadoId && a.opId === opId && a.microId === microId,
  );
}

export function appendLancamento(
  acerto: AcertoTerceirizado,
  lancamento: AcertoLancamento,
): AcertoTerceirizado {
  const lancamentos = [...(acerto.lancamentos ?? []), lancamento];
  const t = totaisAcerto({
    valorOriginal: acerto.valorOriginal,
    lancamentos,
    desconto: 0,
    pago: 0,
  });
  return {
    ...acerto,
    lancamentos,
    desconto: t.desconto,
    pago: t.pago,
    status: t.restante <= 0 ? "pago" : "pagando",
    updatedAt: new Date().toISOString(),
  };
}
