"use client";

import { useState } from "react";
import { Badge, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { formatCnpj, lookupCnpj } from "@/lib/cnpj";
import { uid } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import { useStore } from "@/lib/store/store";

export default function CadastrosPage() {
  const { state, dispatch, isAdmin } = useStore();
  const [tipo, setTipo] = useState<"empresa" | "cliente" | "fornecedor">("cliente");
  const [cnpj, setCnpj] = useState("");
  const [nome, setNome] = useState("");
  const [razao, setRazao] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [contato, setContato] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  if (!isAdmin) return <p className="p-6 text-sm text-mute">Acesso restrito.</p>;

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
    if (!nome.trim() && !razao.trim()) return;
    const id = uid(tipo === "empresa" ? "emp" : tipo === "cliente" ? "cli" : "for");
    if (tipo === "empresa") {
      dispatch({
        type: "SAVE_EMPRESA",
        empresa: { id, nome: nome || razao, cnpj, razaoSocial: razao, endereco, cidade, uf, ativa: true },
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
    setCnpj("");
    setNome("");
    setRazao("");
    setEndereco("");
    setCidade("");
    setUf("");
    setContato("");
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Cadastros"
        title="Empresas, clientes e fornecedores"
        description="Um único lugar. Digite o CNPJ para preencher razão social e endereço."
      />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["cliente", "empresa", "fornecedor"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`motion-press rounded-md px-3 py-1.5 text-[12px] ${tipo === t ? "bg-elevated text-ink" : "text-mute hover:bg-elevated/60"}`}
            >
              {t === "cliente" ? "Cliente" : t === "empresa" ? "Empresa" : "Fornecedor"}
            </button>
          ))}
        </div>
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
        <div className="mt-3 flex justify-end">
          <Button type="button" onClick={salvar}>
            Salvar cadastro
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4">
          <p className="kicker mb-3">Empresas</p>
          {state.empresas.map((e) => (
            <div key={e.id} className="border-b border-line py-2 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                {e.nome}
                <Badge tone={e.ativa ? "mint" : "mute"}>{e.ativa ? "Ativa" : "Inativa"}</Badge>
              </div>
              {e.cnpj ? <p className="text-[11px] text-faint">{e.cnpj}</p> : null}
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
              {e.cnpj ? <p className="text-[11px] text-faint">{e.cnpj}</p> : null}
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
