"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { nInt } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import { opAtivaParaTerceirizado, opsDoTerceirizado } from "@/lib/terceirizado-ops";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Select,
  TabPanel,
  Tabs,
} from "@/components/ui";
import { ServicosLista } from "@/components/terceirizados/servicos-lista";
import { TerceirizadoForm } from "@/components/terceirizados/terceirizado-form";
import { useStore } from "@/lib/store/store";

type FiltroStatus = "todos" | "ativo" | "inativo";
type FiltroOps = "todas" | "com_ativas" | "sem_ativas" | "aguardando";

function temAguardando(ops: ReturnType<typeof opsDoTerceirizado>, terceirizadoId: string) {
  return ops.some((op) =>
    op.micros.some(
      (m) =>
        m.terceirizadoId === terceirizadoId &&
        (m.status === "aguardando" || m.status === "pendencia"),
    ),
  );
}

export default function TerceirizadosPage() {
  const { state, currentUser, isAdmin } = useStore();
  const [novoAberto, setNovoAberto] = useState(false);
  const [vista, setVista] = useState<"servicos" | "parceiros">("parceiros");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [opsFiltro, setOpsFiltro] = useState<FiltroOps>("todas");

  const base = isAdmin
    ? state.terceirizados
    : state.terceirizados.filter((t) => t.id === currentUser.terceirizadoId);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return base
      .map((t) => {
        const ops = opsDoTerceirizado(state.ops, t.id);
        const ativas = ops.filter((o) => opAtivaParaTerceirizado(o, t.id));
        const aguardando = temAguardando(ops, t.id);
        const servicos = servicosDe(t);
        return { t, ops, ativas, aguardando, servicos };
      })
      .filter(({ t, ativas, aguardando, servicos }) => {
        if (status === "ativo" && !t.ativo) return false;
        if (status === "inativo" && t.ativo) return false;
        if (opsFiltro === "com_ativas" && !ativas.length) return false;
        if (opsFiltro === "sem_ativas" && ativas.length) return false;
        if (opsFiltro === "aguardando" && !aguardando) return false;
        if (!query) return true;
        const blob = `${t.nome} ${servicos.map((s) => s.nome).join(" ")}`.toLowerCase();
        return blob.includes(query);
      })
      .sort((a, b) => a.t.nome.localeCompare(b.t.nome, "pt-BR"));
  }, [base, state.ops, q, status, opsFiltro]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title={isAdmin ? "Terceirizados" : "Meu perfil"}
        description={
          isAdmin
            ? "Toque num parceiro para abrir. A aba Serviços mostra o que está com cada um."
            : "Suas OPs ativas, serviços e histórico de pagamentos."
        }
        actions={
          isAdmin ? (
            <Button
              type="button"
              size="sm"
              variant={novoAberto ? "ghost" : "primary"}
              onClick={() => {
                setVista("parceiros");
                setNovoAberto((v) => !v);
              }}
            >
              {novoAberto ? (
                "Fechar"
              ) : (
                <>
                  <Plus size={14} /> Novo
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {isAdmin ? (
        <Tabs
          value={vista}
          onChange={setVista}
          className="max-w-md"
          items={[
            { id: "parceiros", label: "Parceiros", count: base.length },
            { id: "servicos", label: "Serviços com terceirizados" },
          ]}
        />
      ) : null}

      {!isAdmin && currentUser.terceirizadoId ? (
        <ServicosLista terceirizadoId={currentUser.terceirizadoId} />
      ) : null}

      {isAdmin ? (
        <TabPanel value={vista} className="space-y-4">
          {vista === "servicos" ? <ServicosLista /> : null}

          {vista === "parceiros" && novoAberto ? (
            <Card className="p-4">
              <p className="kicker mb-3">Novo terceirizado</p>
              <TerceirizadoForm onSaved={() => setNovoAberto(false)} />
            </Card>
          ) : null}

          {vista === "parceiros" ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar parceiro"
                  className="w-full sm:max-w-xs"
                />
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FiltroStatus)}
                  className="w-full sm:w-40"
                >
                  <option value="todos">Todos os status</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </Select>
                <Select
                  value={opsFiltro}
                  onChange={(e) => setOpsFiltro(e.target.value as FiltroOps)}
                  className="w-full sm:w-48"
                >
                  <option value="todas">Todas as OPs</option>
                  <option value="com_ativas">Com OP ativa</option>
                  <option value="sem_ativas">Sem OP ativa</option>
                  <option value="aguardando">Aguardando / pendência</option>
                </Select>
              </div>

              {rows.length ? (
                <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-card">
                  {rows.map(({ t, ativas, aguardando, servicos }) => (
                    <li key={t.id}>
                      <Link
                        href={`/terceirizados/${t.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-elevated/60"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-elevated text-[11px] font-semibold text-mute">
                          {t.nome.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">{t.nome}</span>
                          <span className="block truncate text-[12px] text-faint">
                            {servicos.map((s) => s.nome).join(" · ") || "Sem serviços cadastrados"}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={t.ativo ? "mint" : "mute"}>{t.ativo ? "Ativo" : "Inativo"}</Badge>
                          <span className="text-[11px] text-faint">
                            {ativas.length
                              ? `${nInt.format(ativas.length)} OP${ativas.length === 1 ? "" : "s"} ativa${ativas.length === 1 ? "" : "s"}`
                              : "Sem OP ativa"}
                            {aguardando ? " · aguardando" : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty
                  title="Nenhum terceirizado encontrado"
                  hint={
                    q || status !== "todos" || opsFiltro !== "todas"
                      ? "Ajuste os filtros ou a busca."
                      : "Cadastre o primeiro parceiro com o botão Novo."
                  }
                />
              )}

              {rows.length ? (
                <p className="text-[11px] text-faint">
                  {nInt.format(rows.length)} de {nInt.format(base.length)} parceiro
                  {base.length === 1 ? "" : "s"} · clique para abrir
                </p>
              ) : null}
            </>
          ) : null}
        </TabPanel>
      ) : null}
    </div>
  );
}
