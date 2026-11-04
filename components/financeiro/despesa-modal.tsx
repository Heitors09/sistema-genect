"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Repeat } from "lucide-react";
import { CATEGORIA_IDS, PLANO_CONTA_IDS } from "@/lib/dre-defaults";
import { brl, competenciaAtual, todayISO, uid } from "@/lib/format";
import {
  addMonths,
  FORMAS_PAGAMENTO,
  formaPagamentoLabel,
  funcionarioAtivoEm,
  tipoFolhaLabel,
} from "@/lib/financeiro";
import type { ContaPagar, FormaPagamento, TipoFolha } from "@/lib/types";
import { useStore } from "@/lib/store/store";
import { Button, DateInput, Field, Input, Modal, Select, cn } from "../ui";

type Favorecido = "fornecedor" | "cliente" | "outro";

const TIPOS_FOLHA_MANUAIS: TipoFolha[] = ["adiantamento", "vale", "bonificacao", "rescisao", "outros"];

export function DespesaModal({
  open,
  onClose,
  funcionarioInicial,
  somenteFuncionario,
  tipoFolhaInicial = "adiantamento",
}: {
  open: boolean;
  onClose: () => void;
  funcionarioInicial?: string;
  /** Abre já como despesa com funcionário (menu da folha). */
  somenteFuncionario?: boolean;
  tipoFolhaInicial?: TipoFolha;
}) {
  if (!open) return null;
  return (
    <DespesaModalBody
      onClose={onClose}
      funcionarioInicial={funcionarioInicial}
      somenteFuncionario={somenteFuncionario}
      tipoFolhaInicial={tipoFolhaInicial}
    />
  );
}

function DespesaModalBody({
  onClose,
  funcionarioInicial,
  somenteFuncionario,
  tipoFolhaInicial,
}: {
  onClose: () => void;
  funcionarioInicial?: string;
  somenteFuncionario?: boolean;
  tipoFolhaInicial: TipoFolha;
}) {
  const { state, dispatch } = useStore();
  const padraoPagar =
    state.categoriasFinanceiras.find((c) => c.padraoPagar && c.ativa)?.id ?? CATEGORIA_IDS.admin;
  const empresas = state.empresas.filter((e) => e.ativa);
  const compAtual = competenciaAtual();
  const funcionariosAtivos = state.funcionarios.filter((f) => funcionarioAtivoEm(f, compAtual));

  const [comFuncionario, setComFuncionario] = useState(!!somenteFuncionario || !!funcionarioInicial);
  const [funcionarioId, setFuncionarioId] = useState(funcionarioInicial ?? funcionariosAtivos[0]?.id ?? "");
  const [tipoFolha, setTipoFolha] = useState<TipoFolha>(tipoFolhaInicial);
  const funcionario = state.funcionarios.find((f) => f.id === funcionarioId);

  const [empresaId, setEmpresaId] = useState(funcionario?.empresaId ?? empresas[0]?.id ?? "");
  const [favTipo, setFavTipo] = useState<Favorecido>("fornecedor");
  const [fornecedorId, setFornecedorId] = useState(state.fornecedores[0]?.id ?? "");
  const [clienteId, setClienteId] = useState(state.clientes[0]?.id ?? "");
  const [favorecido, setFavorecido] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState(padraoPagar);
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [contaBancariaId, setContaBancariaId] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(todayISO());
  const [competencia, setCompetencia] = useState(compAtual);
  const [paga, setPaga] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(todayISO());

  const [recorrente, setRecorrente] = useState(false);
  const [nParcelas, setNParcelas] = useState("12");
  const [mesInicio, setMesInicio] = useState(compAtual);
  const [diaCobranca, setDiaCobranca] = useState("10");
  const [modoValor, setModoValor] = useState<"parcela" | "total">("parcela");
  const [erro, setErro] = useState("");

  const categoriasDespesa = useMemo(
    () => state.categoriasFinanceiras.filter((c) => c.ativa && c.tipo === "despesa_custo"),
    [state.categoriasFinanceiras],
  );
  const contasEmpresa = state.contasBancarias.filter((c) => c.ativa && c.empresaId === empresaId);

  const v = Number(valor) || 0;
  const n = Math.min(120, Math.max(1, Math.floor(Number(nParcelas)) || 1));
  const valorParcela = recorrente ? (modoValor === "total" ? Number((v / n).toFixed(2)) : v) : v;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (v <= 0) return setErro("Informe um valor maior que zero.");
    if (comFuncionario && !funcionario) return setErro("Selecione o funcionário.");
    if (!comFuncionario && !descricao.trim()) return setErro("Informe a descrição.");
    setErro("");
    const cat = state.categoriasFinanceiras.find((c) => c.id === categoriaId);
    const descFinal = comFuncionario
      ? `${tipoFolhaLabel[tipoFolha]} · ${funcionario!.nome}${descricao.trim() ? ` · ${descricao.trim()}` : ""}`
      : descricao.trim();
    const base: Omit<ContaPagar, "id" | "valor" | "vencimento" | "competencia" | "pagamentos"> = {
      empresaId: comFuncionario ? funcionario!.empresaId : empresaId,
      descricao: descFinal,
      origem: comFuncionario ? "folha" : "manual",
      categoriaId: comFuncionario ? CATEGORIA_IDS.folha : categoriaId,
      contaPlanoId: comFuncionario ? PLANO_CONTA_IDS.folha : cat?.contaPlanoId,
      formaPagamento: forma,
      contaBancariaId: contaBancariaId || undefined,
      fornecedorId: !comFuncionario && favTipo === "fornecedor" ? fornecedorId || undefined : undefined,
      clienteId: !comFuncionario && favTipo === "cliente" ? clienteId || undefined : undefined,
      favorecido: !comFuncionario && favTipo === "outro" ? favorecido.trim() || undefined : undefined,
      funcionarioId: comFuncionario ? funcionario!.id : undefined,
      tipoFolha: comFuncionario ? tipoFolha : undefined,
    };

    if (!recorrente) {
      const valorFinal = Number(v.toFixed(2));
      dispatch({
        type: "SAVE_CONTA_PAGAR",
        conta: {
          ...base,
          id: uid("cp"),
          valor: valorFinal,
          vencimento,
          competencia,
          pagamentos: paga ? [{ id: uid("pg"), valor: valorFinal, data: dataPagamento, estornado: false }] : [],
        },
      });
      onClose();
      return;
    }

    const grupoId = uid("rec");
    const dia = Math.min(28, Math.max(1, Number(diaCobranca) || 1));
    const contas: ContaPagar[] = Array.from({ length: n }, (_, i) => {
      const venc = addMonths(`${mesInicio}-01`, i, dia);
      const valorI =
        modoValor === "total" && i === n - 1 ? Number((v - valorParcela * (n - 1)).toFixed(2)) : valorParcela;
      return {
        ...base,
        id: uid("cp"),
        descricao: `${descFinal} (${i + 1}/${n})`,
        programada: true,
        recorrenciaDia: dia,
        parcela: { grupoId, numero: i + 1, total: n },
        valor: valorI,
        vencimento: venc,
        competencia: venc.slice(0, 7),
        pagamentos:
          paga && i === 0 ? [{ id: uid("pg"), valor: valorI, data: dataPagamento, estornado: false }] : [],
      };
    });
    dispatch({ type: "SAVE_CONTAS_PAGAR", contas });
    onClose();
  }

  return (
    <Modal open title={somenteFuncionario ? "Despesa com funcionário" : "Nova despesa"} onClose={onClose} size="lg">
      <form className="space-y-3" onSubmit={submit}>
        {!somenteFuncionario ? (
          <label className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px]">
            <input
              type="checkbox"
              checked={comFuncionario}
              onChange={(e) => setComFuncionario(e.target.checked)}
            />
            Despesa com funcionário
            <span className="text-[11px] text-faint">— adiantamento, vale, bonificação… (vai para a Folha de pagamento)</span>
          </label>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {comFuncionario ? (
            <>
              <Field label="Funcionário">
                <Select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
                  {funcionariosAtivos.length ? null : <option value="">Nenhum funcionário ativo</option>}
                  {funcionariosAtivos.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome} · {f.cargo}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Tipo">
                <Select value={tipoFolha} onChange={(e) => setTipoFolha(e.target.value as TipoFolha)}>
                  {TIPOS_FOLHA_MANUAIS.map((t) => (
                    <option key={t} value={t}>{tipoFolhaLabel[t]}</option>
                  ))}
                </Select>
              </Field>
            </>
          ) : (
            <>
              <Field label="Empresa">
                <Select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setContaBancariaId(""); }}>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Categoria">
                <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                  {categoriasDespesa.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Cliente / fornecedor">
                <Select value={favTipo} onChange={(e) => setFavTipo(e.target.value as Favorecido)}>
                  <option value="fornecedor">Fornecedor</option>
                  <option value="cliente">Cliente</option>
                  <option value="outro">Outro (digitar)</option>
                </Select>
              </Field>
              <Field label={favTipo === "fornecedor" ? "Fornecedor" : favTipo === "cliente" ? "Cliente" : "Favorecido"}>
                {favTipo === "fornecedor" ? (
                  <Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                    <option value="">— sem fornecedor —</option>
                    {state.fornecedores.filter((f) => f.ativo).map((f) => (
                      <option key={f.id} value={f.id}>{f.razaoSocial}</option>
                    ))}
                  </Select>
                ) : favTipo === "cliente" ? (
                  <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                    {state.clientes.filter((c) => c.ativo).map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={favorecido} onChange={(e) => setFavorecido(e.target.value)} placeholder="Ex.: Prefeitura" />
                )}
              </Field>
            </>
          )}
          <div className="sm:col-span-2">
            <Field label={comFuncionario ? "Observação" : "Descrição"} hint={comFuncionario ? "Opcional" : undefined}>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} required={!comFuncionario} />
            </Field>
          </div>
          <Field label="Método de pagamento">
            <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{formaPagamentoLabel[f]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Conta bancária">
            <Select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)}>
              <option value="">— não informada —</option>
              {(comFuncionario && funcionario
                ? state.contasBancarias.filter((c) => c.ativa && c.empresaId === funcionario.empresaId)
                : contasEmpresa
              ).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label={recorrente && modoValor === "total" ? "Valor total" : "Valor"}>
            <Input type="number" step="0.01" min={0} value={valor} onChange={(e) => setValor(e.target.value)} required />
          </Field>
          {!recorrente ? (
            <>
              <Field label="Vencimento">
                <DateInput value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
              </Field>
              <Field label="Competência">
                <Input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
              </Field>
            </>
          ) : null}
        </div>

        <div className="rounded-md border border-line p-3">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={paga} onChange={(e) => setPaga(e.target.checked)} />
            Despesa já paga
          </label>
          {paga ? (
            <div className="mt-2 max-w-xs">
              <Field label="Data em que foi paga" hint={recorrente ? "Baixa apenas a 1ª parcela" : undefined}>
                <DateInput value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
              </Field>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-line p-3">
          <Button
            type="button"
            size="sm"
            variant={recorrente ? "soft" : "ghost"}
            onClick={() => setRecorrente((x) => !x)}
            aria-pressed={recorrente}
          >
            <Repeat size={13} /> {recorrente ? "Recorrência ativada" : "Definir recorrência"}
          </Button>
          {recorrente ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field label="Nº de parcelas">
                <Input type="number" min={1} max={120} value={nParcelas} onChange={(e) => setNParcelas(e.target.value)} />
              </Field>
              <Field label="Mês de início">
                <Input type="month" value={mesInicio} onChange={(e) => setMesInicio(e.target.value)} />
              </Field>
              <Field label="Dia da cobrança" hint="1 a 28">
                <Input type="number" min={1} max={28} value={diaCobranca} onChange={(e) => setDiaCobranca(e.target.value)} />
              </Field>
              <Field label="O valor é">
                <Select value={modoValor} onChange={(e) => setModoValor(e.target.value as "parcela" | "total")}>
                  <option value="parcela">Por parcela</option>
                  <option value="total">Total a dividir</option>
                </Select>
              </Field>
              <p className="text-[11px] text-faint sm:col-span-4">
                Gera {n} lançamento{n === 1 ? "" : "s"} de {brl.format(valorParcela)} — de{" "}
                {addMonths(`${mesInicio}-01`, 0, Math.min(28, Math.max(1, Number(diaCobranca) || 1)))
                  .split("-")
                  .reverse()
                  .join("/")}{" "}
                até{" "}
                {addMonths(`${mesInicio}-01`, n - 1, Math.min(28, Math.max(1, Number(diaCobranca) || 1)))
                  .split("-")
                  .reverse()
                  .join("/")}
                . Cada um entra na competência do seu mês.
              </p>
            </div>
          ) : null}
        </div>

        {erro ? <p className={cn("text-[12px] text-rose")}>{erro}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{recorrente ? `Lançar ${n} parcelas` : "Lançar despesa"}</Button>
        </div>
      </form>
    </Modal>
  );
}
