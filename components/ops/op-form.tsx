"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { brl, categoriaLabel, parseBRL, tipoNegocioLabel, todayISO, uid } from "@/lib/format";
import { linhasReserva, tecidoBase } from "@/lib/ficha";
import type { OrdemProducao, TipoNegocio } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, CreatableSelect, Field, Input, Select, Textarea } from "../ui";

function packAtados(opNumero: string, qty: number, pack: number, stageId: string) {
  const n = Math.max(1, Math.ceil(qty / pack));
  return Array.from({ length: n }, (_, i) => {
    const remaining = qty - i * pack;
    return {
      id: uid("at"),
      codigo: `AT-${opNumero.replace(/^OP-/, "")}-${String(i + 1).padStart(2, "0")}`,
      quantidade: Math.min(pack, remaining),
      stageId,
      status: "aberto" as const,
    };
  });
}

export function OpForm({ initial }: { initial?: OrdemProducao }) {
  const router = useRouter();
  const { state, dispatch, isAdmin } = useStore();
  const empresas = state.empresas.filter((e) => e.ativa);
  const clientes = state.clientes.filter((c) => c.ativo);
  const produtos = state.produtos;
  const terceiros = state.terceirizados.filter((t) => t.ativo);
  const initialProduto = produtos.find((p) => p.id === initial?.produtoId);

  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [dataEntrada, setDataEntrada] = useState(initial?.dataEntrada ?? todayISO());
  const [empresaId, setEmpresaId] = useState(initial?.empresaId ?? empresas[0]?.id ?? "");
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? clientes[0]?.id ?? "");
  const [produtoId, setProdutoId] = useState(initial?.produtoId ?? "");
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>(
    initial?.tipoNegocio ?? initialProduto?.tipoNegocio ?? "servico",
  );
  const [tipoTouched, setTipoTouched] = useState(!!initial);
  const [cor, setCor] = useState(initial?.cor ?? "");
  const [quantidade, setQuantidade] = useState(String(initial?.quantidade ?? 50));
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [terceirizadoId, setTerceirizadoId] = useState(initial?.terceirizadoIds[0] ?? "");
  const [valorServico, setValorServico] = useState(
    initial ? initial.valorServicoPorPeca.toFixed(2).replace(".", ",") : "5,00",
  );
  const [loteId, setLoteId] = useState(initial?.lotesInsumo[0]?.loteId ?? "");
  const [pack, setPack] = useState("50");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const produto = produtos.find((p) => p.id === produtoId);
  const tecido = produto ? tecidoBase(produto, state.insumos) : undefined;
  const lotes = state.lotes.filter((l) => l.insumoId === tecido?.insumoId && l.quantidadeRestante > 0);
  const loteIds = lotes.map((l) => l.id).join(",");
  const consumo = (tecido?.consumoPorPeca ?? 0) * Number(quantidade || 0);

  useEffect(() => {
    if (!produto) return;
    setCor((atual) => (produto.cores.includes(atual) ? atual : (produto.cores[0] ?? "")));
    if (!tipoTouched) setTipoNegocio(produto.tipoNegocio ?? "servico");
    if (initial?.lotesInsumo[0]?.loteId) return;
    const ids = loteIds.split(",").filter(Boolean);
    setLoteId((atual) => (atual && ids.includes(atual) ? atual : (ids[0] ?? "")));
  }, [produto, loteIds, initial?.lotesInsumo, tipoTouched]);

  const reserva = useMemo(() => {
    if (!produto) return [];
    const qty = Number(quantidade || 0);
    return linhasReserva(produto, tipoNegocio).map((item) => {
      const ins = state.insumos.find((i) => i.id === item.insumoId);
      const disp = ins ? ins.estoqueAtual - ins.reservado : 0;
      const qtd = item.consumoPorPeca * qty;
      return { ...item, qtd, insumo: ins, disp, ok: disp >= qtd };
    });
  }, [produto, quantidade, state.insumos, tipoNegocio]);

  function validate() {
    const e: Record<string, string> = {};
    if (!numero.trim()) e.numero = "Obrigatório";
    else if (numero.length > 100) e.numero = "Máximo de 100 caracteres";
    if (!dataEntrada) e.dataEntrada = "Obrigatório";
    if (!empresaId) e.empresaId = "Selecione a empresa";
    if (!clienteId) e.clienteId = "Selecione o cliente";
    if (!produto) e.produtoId = "Selecione o produto";
    if (produto && !cor) e.cor = "Selecione a cor do produto";
    const q = Number(quantidade);
    if (!Number.isInteger(q) || q <= 0) e.quantidade = "Informe um inteiro maior que zero";
    if (observacoes.length > 2000) e.observacoes = "Máximo de 2.000 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!isAdmin) return;
    if (!validate() || !produto) return;
    const q = Number(quantidade);
    const stageId = initial?.stageId ?? state.boardNodes.find((n) => n.kind === "recebimento")?.id ?? state.boardNodes[0]?.id;
    const op: OrdemProducao = {
      id: initial?.id ?? uid("op"),
      numero: numero.trim(),
      dataEntrada,
      empresaId,
      clienteId,
      produtoId: produto.id,
      tipoNegocio,
      cor,
      quantidade: q,
      precoUnitario: produto.precoVenda,
      observacoes,
      terceirizadoIds: terceirizadoId ? [terceirizadoId] : [],
      valorServicoPorPeca: parseBRL(valorServico) || 0,
      quantidadeProduzida: initial?.quantidadeProduzida ?? 0,
      perdas: initial?.perdas ?? 0,
      refugo: initial?.refugo ?? 0,
      lotesInsumo: tipoNegocio === "fabricacao" && loteId ? [{ loteId, quantidade: consumo }] : [],
      parentOpId: initial?.parentOpId,
      atados: initial?.atados?.length ? initial.atados : packAtados(numero.trim(), q, Number(pack) || 50, stageId),
      status: initial?.status ?? "aberta",
      stageId,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    dispatch({ type: "SAVE_OP", op, isNew: !initial });
    router.push(`/ops/${op.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-3 surface rounded-md p-4 lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número da OP" error={errors.numero}>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={100} required />
          </Field>
          <Field label="Data de entrada" error={errors.dataEntrada}>
            <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} required />
          </Field>
          <Field label="Empresa" error={errors.empresaId}>
            <Select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cliente" error={errors.clienteId}>
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              {clientes.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Produto"
            error={errors.produtoId}
            hint={produto ? produto.referencia : "Produtos cadastrados"}
          >
            <Select
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setTipoTouched(false);
              }}
            >
              <option value="">Selecione o produto</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.referencia} · {p.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Modelo"
            hint={produto ? `Padrão do produto: ${tipoNegocioLabel[produto.tipoNegocio]}` : "Herdado do produto, pode alterar nesta OP"}
          >
            <Select
              value={tipoNegocio}
              onChange={(e) => {
                setTipoTouched(true);
                setTipoNegocio(e.target.value as TipoNegocio);
              }}
            >
              <option value="servico">{tipoNegocioLabel.servico}</option>
              <option value="fabricacao">{tipoNegocioLabel.fabricacao}</option>
            </Select>
          </Field>
          <Field label="Cor" error={errors.cor} hint="Cores do produto — pode adicionar nesta OP">
            <CreatableSelect
              value={cor}
              disabled={!produto}
              emptyLabel={produto ? "Selecione a cor" : "Selecione o produto"}
              options={(produto?.cores ?? []).map((c) => ({ value: c, label: c }))}
              addLabel="+ Nova cor"
              addPlaceholder="Ex.: Preto"
              onChange={setCor}
              onAdd={(nova) => {
                if (!produto) return;
                dispatch({ type: "ADD_PRODUCT_COLOR", produtoId: produto.id, cor: nova });
                setCor(nova);
              }}
            />
          </Field>
          <Field label="Quantidade" error={errors.quantidade}>
            <Input type="number" min={1} step={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </Field>
          <Field label="Preço unitário" hint="Preenchido pelo cadastro do produto">
            <Input
              readOnly
              value={produto ? brl.format(produto.precoVenda) : "—"}
              className="cursor-default text-mute"
            />
          </Field>
          <Field label="Terceirizado" hint="Cadastre novos em Terceirizados">
            <Select value={terceirizadoId} onChange={(e) => setTerceirizadoId(e.target.value)}>
              <option value="">Sem terceirizado</option>
              {terceiros.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.valorPorPeca > 0 ? `${t.nome} · R$ ${t.valorPorPeca.toFixed(2)}/pç` : t.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serviço por peça">
            <Input value={valorServico} onChange={(e) => setValorServico(e.target.value)} />
          </Field>
          {tipoNegocio === "fabricacao" && lotes.length > 1 ? (
            <Field label="Lote do tecido" hint="Rastreio de banho — evite misturar tonalidades">
              <Select value={loteId} onChange={(e) => setLoteId(e.target.value)}>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.loteFabricante} · restam {l.quantidadeRestante} {l.unidade}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {!initial ? (
            <Field label="Tamanho do atado" hint="Divisão do lote para o chão">
              <Input type="number" min={1} value={pack} onChange={(e) => setPack(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <Field label="Observações" error={errors.observacoes} hint={`${observacoes.length}/2000`}>
          <Textarea value={observacoes} maxLength={2000} onChange={(e) => setObservacoes(e.target.value)} />
        </Field>
        {isAdmin ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit">
              {initial ? "Salvar OP" : reserva.length ? "Criar OP e reservar insumos" : "Criar OP"}
            </Button>
          </div>
        ) : null}
      </div>
      <aside className="space-y-3">
        <div className="surface rounded-md p-4">
          <p className="kicker">{tipoNegocio === "servico" ? "Insumos do serviço" : "Ficha técnica"}</p>
          <p className="mt-1 text-[12px] text-faint">
            {tipoNegocio === "servico"
              ? reserva.length
                ? "Itens que a Genect compra neste serviço (ex.: linha). O restante vem cortado do cliente. A OP ainda não gera receita."
                : "Serviço de costura: o cliente envia tecido cortado, botão, zíper e linha. Só aparece reserva se o produto tiver um insumo comprado pela Genect."
              : "Fabricação própria: a ficha reserva tecido, linha, zíper e botão para o custo. A OP ainda não gera receita."}
          </p>
          {produto ? (
            reserva.length ? (
              <ul className="mt-3 space-y-2">
                {reserva.map((r) => (
                  <li key={r.insumoId} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="min-w-0">
                      <span className="text-ink">{r.insumo?.codigo}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-faint">
                        {r.insumo ? categoriaLabel[r.insumo.categoria] : "Insumo"} · {r.insumo?.descricao}
                      </span>
                    </span>
                    <span className={r.ok ? "shrink-0 text-mint" : "shrink-0 text-rose"}>
                      {r.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / {r.disp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-faint">Nenhum insumo a reservar nesta OP.</p>
            )
          ) : (
            <p className="mt-3 text-[12px] text-faint">Selecione o produto para ver a ficha.</p>
          )}
          {tipoNegocio === "fabricacao" && lotes.length === 1 ? (
            <p className="mt-3 text-[11px] text-faint">
              Lote {lotes[0].loteFabricante} será usado no rastreio de banho.
            </p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
