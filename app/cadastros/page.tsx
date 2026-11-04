"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, DateInput, Field, Input, PageHeader, Select, cn } from "@/components/ui";
import { formatCnpj, lookupCnpj } from "@/lib/cnpj";
import { brl, formatDate, todayISO, uid } from "@/lib/format";
import { funcionarioDemitido } from "@/lib/financeiro";
import { servicosDe } from "@/lib/migrate";
import type { Empresa, FiscalEmpresa, Funcionario, RegimeTributario } from "@/lib/types";
import { useStore } from "@/lib/store/store";

type Tipo = "cliente" | "empresa" | "fornecedor" | "funcionario";

const TIPOS: { id: Tipo; label: string }[] = [
  { id: "cliente", label: "Cliente" },
  { id: "empresa", label: "Empresa" },
  { id: "fornecedor", label: "Fornecedor" },
  { id: "funcionario", label: "Funcionário" },
];

const regimeLabel: Record<RegimeTributario, string> = {
  simples_nacional: "Simples Nacional",
  mei: "MEI",
  lucro_presumido: "Lucro Presumido",
  lucro_real: "Lucro Real",
};

const ANEXOS = ["I", "II", "III", "IV", "V"];
const FAIXAS = ["1ª faixa", "2ª faixa", "3ª faixa", "4ª faixa", "5ª faixa", "6ª faixa"];

const fiscalVazio: FiscalEmpresa = {
  regimeTributario: "simples_nacional",
  anexoSimples: "II",
  faixaEnquadramento: "1ª faixa",
  integracoes: { notaFiscal: false, bancos: false, contabilidade: false },
};

export default function CadastrosPage() {
  const { state, dispatch, isAdmin } = useStore();
  const params = useSearchParams();
  const tipoUrl = params.get("tipo");
  const editarUrl = params.get("editar");
  const funcUrl =
    tipoUrl === "funcionario" && editarUrl ? state.funcionarios.find((x) => x.id === editarUrl) : undefined;
  const [tipo, setTipo] = useState<Tipo>(
    tipoUrl === "funcionario" || tipoUrl === "empresa" || tipoUrl === "fornecedor" ? tipoUrl : "cliente",
  );
  const [editId, setEditId] = useState<string | null>(funcUrl?.id ?? null);
  const [cnpj, setCnpj] = useState("");
  const [nome, setNome] = useState(funcUrl?.nome ?? "");
  const [razao, setRazao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [contato, setContato] = useState("");
  const [fiscal, setFiscal] = useState<FiscalEmpresa>(fiscalVazio);
  // funcionário
  const [cpf, setCpf] = useState(funcUrl?.cpf ?? "");
  const [empresaId, setEmpresaId] = useState(funcUrl?.empresaId ?? state.empresas.find((e) => e.ativa)?.id ?? "");
  const [cargo, setCargo] = useState(funcUrl?.cargo ?? "");
  const [salario, setSalario] = useState(funcUrl ? String(funcUrl.salarioMensal || "") : "");
  const [admissao, setAdmissao] = useState(funcUrl?.dataAdmissao ?? todayISO());
  const [demissao, setDemissao] = useState(funcUrl?.dataDemissao ?? "");
  const [diaPagamento, setDiaPagamento] = useState(String(funcUrl?.diaPagamento ?? 5));
  const [contaBancariaId, setContaBancariaId] = useState(funcUrl?.contaBancariaId ?? "");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [mostrarDemitidos, setMostrarDemitidos] = useState(true);


  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

  function limpar() {
    setEditId(null);
    setCnpj("");
    setNome("");
    setRazao("");
    setEndereco("");
    setCidade("");
    setUf("");
    setContato("");
    setFiscal(fiscalVazio);
    setCpf("");
    setCargo("");
    setSalario("");
    setAdmissao(todayISO());
    setDemissao("");
    setDiaPagamento("5");
    setContaBancariaId("");
    setErro("");
  }

  function trocarTipo(t: Tipo) {
    limpar();
    setTipo(t);
  }

  function carregarEmpresa(e: Empresa) {
    setTipo("empresa");
    setEditId(e.id);
    setCnpj(e.cnpj ?? "");
    setNome(e.nome);
    setRazao(e.razaoSocial ?? "");
    setEndereco(e.endereco ?? "");
    setCidade(e.cidade ?? "");
    setUf(e.uf ?? "");
    setFiscal({ ...fiscalVazio, ...e.fiscal, integracoes: { ...fiscalVazio.integracoes!, ...e.fiscal?.integracoes } });
  }

  function carregarFuncionario(f: Funcionario) {
    setTipo("funcionario");
    setEditId(f.id);
    setNome(f.nome);
    setCpf(f.cpf ?? "");
    setEmpresaId(f.empresaId);
    setCargo(f.cargo);
    setSalario(String(f.salarioMensal || ""));
    setAdmissao(f.dataAdmissao);
    setDemissao(f.dataDemissao ?? "");
    setDiaPagamento(String(f.diaPagamento || 5));
    setContaBancariaId(f.contaBancariaId ?? "");
  }

  async function buscar() {
    setBusy(true);
    setErro("");
    const found = await lookupCnpj(cnpj);
    setBusy(false);
    if (!found) {
      setErro("CNPJ não encontrado");
      return;
    }
    setNome(found.nome);
    setRazao(found.razaoSocial);
    setEndereco(found.endereco);
    setCidade(found.cidade);
    setUf(found.uf);
  }

  function salvar() {
    if (tipo === "funcionario") {
      if (!nome.trim() || !cargo.trim() || !empresaId) {
        setErro("Informe nome, cargo e empresa.");
        return;
      }
      if (demissao && demissao < admissao) {
        setErro("A demissão não pode ser antes da admissão.");
        return;
      }
      const atual = editId ? state.funcionarios.find((f) => f.id === editId) : undefined;
      dispatch({
        type: "SAVE_FUNCIONARIO",
        funcionario: {
          ...atual,
          id: atual?.id ?? uid("fun"),
          empresaId,
          nome: nome.trim(),
          cpf: cpf.trim() || undefined,
          cargo: cargo.trim(),
          salarioMensal: Number(salario) || 0,
          dataAdmissao: admissao,
          dataDemissao: demissao || undefined,
          diaPagamento: Math.min(28, Math.max(1, Number(diaPagamento) || 5)),
          contaBancariaId: contaBancariaId || undefined,
        },
      });
      limpar();
      return;
    }
    if (!nome.trim() && !razao.trim()) return;
    const id = editId ?? uid(tipo === "empresa" ? "emp" : tipo === "cliente" ? "cli" : "for");
    if (tipo === "empresa") {
      const atual = state.empresas.find((e) => e.id === id);
      dispatch({
        type: "SAVE_EMPRESA",
        empresa: {
          id,
          nome: nome || razao,
          cnpj,
          razaoSocial: razao,
          endereco,
          cidade,
          uf,
          ativa: atual?.ativa ?? true,
          fiscal,
        },
      });
    } else if (tipo === "cliente") {
      dispatch({
        type: "SAVE_CLIENTE",
        cliente: { id, nome: nome || razao, cnpj, razaoSocial: razao, endereco, cidade, uf, ativo: true },
      });
    } else {
      dispatch({
        type: "SAVE_FORNECEDOR",
        fornecedor: { id, razaoSocial: razao || nome, contato, cnpj, ativo: true },
      });
    }
    limpar();
  }

  const hoje = todayISO();
  const funcionarios = [...state.funcionarios]
    .filter((f) => mostrarDemitidos || !funcionarioDemitido(f, hoje))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const integ = fiscal.integracoes ?? fiscalVazio.integracoes!;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Cadastros"
        title="Empresas, clientes, fornecedores e funcionários"
        description="Um único lugar. Digite o CNPJ para preencher razão social e endereço."
        actions={
          <Link href="/cadastros/contas-bancarias">
            <Button variant="ghost">Contas bancárias</Button>
          </Link>
        }
      />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => trocarTipo(t.id)}
              className={cn(
                "motion-press rounded-md px-3 py-1.5 text-[12px]",
                tipo === t.id ? "bg-elevated text-ink" : "text-mute hover:bg-elevated/60",
              )}
            >
              {t.label}
            </button>
          ))}
          {editId ? (
            <span className="ml-auto flex items-center gap-2 text-[12px] text-amber">
              Editando cadastro
              <button type="button" className="text-mute hover:text-ink" onClick={limpar}>
                cancelar
              </button>
            </span>
          ) : null}
        </div>

        {tipo === "funcionario" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nome">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="CPF" hint="Opcional">
              <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="Empresa">
              <Select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); setContaBancariaId(""); }}>
                {state.empresas.filter((e) => e.ativa).map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Cargo">
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Costureira" />
            </Field>
            <Field label="Salário mensal">
              <Input type="number" step="0.01" min={0} value={salario} onChange={(e) => setSalario(e.target.value)} />
            </Field>
            <Field label="Dia de pagamento" hint="Do mês seguinte (1–28)">
              <Input type="number" min={1} max={28} value={diaPagamento} onChange={(e) => setDiaPagamento(e.target.value)} />
            </Field>
            <Field label="Data de admissão">
              <DateInput value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
            </Field>
            <Field label="Data de demissão" hint="Deixe vazio se ativo — histórico é preservado">
              <div className="flex gap-2">
                <DateInput value={demissao} onChange={(e) => setDemissao(e.target.value)} />
                {demissao ? (
                  <Button type="button" variant="ghost" onClick={() => setDemissao("")}>Limpar</Button>
                ) : null}
              </div>
            </Field>
            <Field label="Conta bancária de pagamento">
              <Select value={contaBancariaId} onChange={(e) => setContaBancariaId(e.target.value)}>
                <option value="">— não informada —</option>
                {state.contasBancarias.filter((c) => c.ativa && c.empresaId === empresaId).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CNPJ" error={erro}>
              <div className="flex gap-2">
                <Input value={cnpj} onChange={(e) => setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
                <Button type="button" variant="ghost" onClick={buscar} disabled={busy}>
                  {busy ? "..." : "Buscar"}
                </Button>
              </div>
            </Field>
            <Field label="Nome fantasia">
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </Field>
            <Field label="Razão social">
              <Input value={razao} onChange={(e) => setRazao(e.target.value)} />
            </Field>
            <Field label="Endereço">
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </Field>
            <Field label="Cidade">
              <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </Field>
            <Field label="UF">
              <Input value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} />
            </Field>
            {tipo === "fornecedor" ? (
              <Field label="Contato">
                <Input value={contato} onChange={(e) => setContato(e.target.value)} />
              </Field>
            ) : null}
          </div>
        )}

        {tipo === "empresa" ? (
          <div className="mt-4 rounded-md border border-line p-3">
            <p className="kicker mb-3">Informações fiscais</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Regime tributário">
                <Select
                  value={fiscal.regimeTributario ?? ""}
                  onChange={(e) => setFiscal({ ...fiscal, regimeTributario: e.target.value as RegimeTributario })}
                >
                  {(Object.keys(regimeLabel) as RegimeTributario[]).map((r) => (
                    <option key={r} value={r}>{regimeLabel[r]}</option>
                  ))}
                </Select>
              </Field>
              {fiscal.regimeTributario === "simples_nacional" ? (
                <>
                  <Field label="Anexo do Simples" hint="Confecção/indústria: Anexo II">
                    <Select value={fiscal.anexoSimples ?? ""} onChange={(e) => setFiscal({ ...fiscal, anexoSimples: e.target.value })}>
                      {ANEXOS.map((a) => (
                        <option key={a} value={a}>Anexo {a}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Faixa de enquadramento" hint="Pela receita bruta dos últimos 12 meses">
                    <Select
                      value={fiscal.faixaEnquadramento ?? ""}
                      onChange={(e) => setFiscal({ ...fiscal, faixaEnquadramento: e.target.value })}
                    >
                      {FAIXAS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </Select>
                  </Field>
                </>
              ) : (
                <Field label="Enquadramento" hint="Opcional">
                  <Input
                    value={fiscal.faixaEnquadramento ?? ""}
                    onChange={(e) => setFiscal({ ...fiscal, faixaEnquadramento: e.target.value })}
                  />
                </Field>
              )}
              <Field label="Inscrição estadual">
                <Input value={fiscal.inscricaoEstadual ?? ""} onChange={(e) => setFiscal({ ...fiscal, inscricaoEstadual: e.target.value })} />
              </Field>
              <Field label="Inscrição municipal">
                <Input value={fiscal.inscricaoMunicipal ?? ""} onChange={(e) => setFiscal({ ...fiscal, inscricaoMunicipal: e.target.value })} />
              </Field>
            </div>
            <p className="kicker mb-2 mt-4">Integrações via API</p>
            <div className="flex flex-wrap gap-4 text-[13px]">
              {(
                [
                  ["notaFiscal", "Emissão de nota fiscal (NF-e/NFS-e)"],
                  ["bancos", "Conciliação bancária"],
                  ["contabilidade", "Envio para a contabilidade"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={integ[k]}
                    onChange={(e) => setFiscal({ ...fiscal, integracoes: { ...integ, [k]: e.target.checked } })}
                  />
                  {label}
                </label>
              ))}
            </div>
            {integ.notaFiscal || integ.bancos || integ.contabilidade ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Provedor" hint="Ex.: Focus NFe, eNotas, Open Finance">
                  <Input value={integ.provedor ?? ""} onChange={(e) => setFiscal({ ...fiscal, integracoes: { ...integ, provedor: e.target.value } })} />
                </Field>
                <Field label="Token da API" hint="Guardado apenas neste navegador">
                  <Input
                    type="password"
                    autoComplete="off"
                    value={integ.apiToken ?? ""}
                    onChange={(e) => setFiscal({ ...fiscal, integracoes: { ...integ, apiToken: e.target.value } })}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        {erro && tipo === "funcionario" ? <p className="mt-2 text-[12px] text-rose">{erro}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={salvar}>
            {editId ? "Salvar alterações" : "Salvar cadastro"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <p className="kicker mb-3">Empresas</p>
          {state.empresas.map((e) => (
            <div key={e.id} className="border-b border-line py-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="text-left hover:text-sky" onClick={() => carregarEmpresa(e)}>
                  {e.nome}
                </button>
                <Badge tone={e.ativa ? "mint" : "mute"}>{e.ativa ? "Ativa" : "Inativa"}</Badge>
              </div>
              <p className="text-[11px] text-faint">
                {[e.cnpj, e.fiscal?.regimeTributario ? regimeLabel[e.fiscal.regimeTributario] : "Regime não informado",
                  e.fiscal?.regimeTributario === "simples_nacional" && e.fiscal.anexoSimples
                    ? `Anexo ${e.fiscal.anexoSimples} · ${e.fiscal.faixaEnquadramento ?? ""}`
                    : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <p className="kicker mb-3">Clientes</p>
          {state.clientes.map((e) => (
            <div key={e.id} className="border-b border-line py-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                {e.nome}
                <Badge tone={e.ativo ? "mint" : "mute"}>{e.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="text-[11px] text-faint">
                {[e.cnpj, `${state.produtos.filter((p) => p.clienteId === e.id).length} produto(s)`].filter(Boolean).join(" · ")}
              </p>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <p className="kicker mb-3">Fornecedores</p>
          {state.fornecedores.map((e) => (
            <div key={e.id} className="border-b border-line py-2 text-[13px]">
              <p>{e.razaoSocial}</p>
              <p className="text-[12px] text-mute">{e.contato || e.cnpj || "—"}</p>
            </div>
          ))}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="kicker">Funcionários</p>
          <div className="flex items-center gap-3 text-[12px]">
            <label className="flex items-center gap-1.5 text-mute">
              <input type="checkbox" checked={mostrarDemitidos} onChange={(e) => setMostrarDemitidos(e.target.checked)} />
              Mostrar demitidos
            </label>
            <Link href="/rh" className="text-sky hover:underline">Abrir Recursos Humanos</Link>
          </div>
        </div>
        {funcionarios.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {funcionarios.map((f) => {
              const dem = funcionarioDemitido(f, hoje);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => carregarFuncionario(f)}
                  className={cn(
                    "rounded-md border border-line px-3 py-2 text-left text-[13px] hover:bg-elevated/60",
                    dem && "opacity-60",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{f.nome}</span>
                    <Badge tone={dem ? "mute" : "mint"}>{dem ? "Demitido" : "Ativo"}</Badge>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-faint">
                    {f.cargo} · {brl.format(f.salarioMensal)} · desde {formatDate(f.dataAdmissao)}
                    {f.dataDemissao ? ` · até ${formatDate(f.dataDemissao)}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-faint">Nenhum funcionário cadastrado.</p>
        )}
      </Card>

      <Card className="p-4">
        <p className="kicker mb-3">Terceirizados e serviços</p>
        {state.terceirizados.map((t) => (
          <div key={t.id} className="border-b border-line py-2 text-[13px]">
            <p>{t.nome}</p>
            <p className="text-[12px] text-faint">
              {servicosDe(t).map((s) => `${s.nome}${s.valorPorPeca ? ` · R$ ${s.valorPorPeca.toFixed(2)}` : ""}`).join(" · ") || "—"}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
