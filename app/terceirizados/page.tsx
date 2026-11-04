"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { brl, nInt } from "@/lib/format";
import { servicosDe } from "@/lib/migrate";
import { opAtivaParaTerceirizado, opsDoTerceirizado } from "@/lib/terceirizado-ops";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Empty,
  Input,
  PageHeader,
  Select,
  Tabs,
  Td,
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
  const [vista, setVista] = useState<"servicos" | "parceiros">("servicos");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<FiltroStatus>("todos");
  const [opsFiltro, setOpsFiltro] = useState<FiltroOps>("todas");
  const [servicoFiltro, setServicoFiltro] = useState("todos");

  const base = isAdmin
    ? state.terceirizados
    : state.terceirizados.filter((t) => t.id === currentUser.terceirizadoId);

  const servicosOpcoes = useMemo(() => {
    const set = new Set<string>();
    for (const t of base) {
      for (const s of servicosDe(t)) if (s.nome.trim()) set.add(s.nome.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [base]);

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
        if (
          servicoFiltro !== "todos" &&
          !servicos.some((s) => s.nome.trim() === servicoFiltro)
        ) {
          return false;
        }
        if (!query) return true;
        const blob = `${t.nome} ${servicos.map((s) => s.nome).join(" ")}`.toLowerCase();
        return blob.includes(query);
      })
      .sort((a, b) => a.t.nome.localeCompare(b.t.nome, "pt-BR"));
  }, [base, state.ops, q, status, opsFiltro, servicoFiltro]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Produção"
        title={isAdmin ? "Terceirizados" : "Meu perfil"}
        description={
          isAdmin
            ? "Lista dos parceiros. Filtre e abra um para ver OPs, serviços e pagamentos."
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
            { id: "servicos", label: "Serviços com terceirizados" },
            { id: "parceiros", label: "Parceiros", count: base.length },
          ]}
        />
      ) : null}

      {isAdmin && vista === "servicos" ? <ServicosLista /> : null}

      {isAdmin && vista === "parceiros" && novoAberto ? (
        <Card className="p-4">
          <p className="kicker mb-3">Novo terceirizado</p>
          <TerceirizadoForm onSaved={() => setNovoAberto(false)} />
        </Card>
      ) : null}

      {!isAdmin && currentUser.terceirizadoId ? (
        <ServicosLista terceirizadoId={currentUser.terceirizadoId} />
      ) : null}

      {!isAdmin || vista === "parceiros" ? (
      <>
      {isAdmin ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nome ou serviço"
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
          <Select
            value={servicoFiltro}
            onChange={(e) => setServicoFiltro(e.target.value)}
            className="w-full sm:w-52"
          >
            <option value="todos">Todos os serviços</option>
            {servicosOpcoes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {rows.length ? (
        <DataTable
          headers={["Terceirizado", "Serviços", "OPs ativas", "Aguardando", "OPs total", "Valor ref.", "Status"]}
        >
          {rows.map(({ t, ops, ativas, aguardando, servicos }) => {
            const valorRef = servicos[0]?.valorPorPeca ?? t.valorPorPeca ?? 0;
            const qtdAguardando = ops.reduce(
              (n, op) =>
                n +
                op.micros.filter(
                  (m) =>
                    m.terceirizadoId === t.id &&
                    (m.status === "aguardando" || m.status === "pendencia"),
                ).length,
              0,
            );
            return (
              <tr key={t.id} className="group">
                <Td>
                  <Link
                    href={`/terceirizados/${t.id}`}
                    className="font-medium text-sky hover:underline"
                  >
                    {t.nome}
                  </Link>
                </Td>
                <Td>
                  <span className="line-clamp-2 text-mute">
                    {servicos.map((s) => s.nome).join(" · ") || "—"}
                  </span>
                </Td>
                <Td>
                  {ativas.length ? (
                    <Badge tone="amber">{nInt.format(ativas.length)}</Badge>
                  ) : (
                    <span className="text-faint">0</span>
                  )}
                </Td>
                <Td>
                  {aguardando ? (
                    <Badge tone="amber">{nInt.format(qtdAguardando)}</Badge>
                  ) : (
                    <span className="text-faint">0</span>
                  )}
                </Td>
                <Td>{nInt.format(ops.length)}</Td>
                <Td className="tabular-nums">
                  {valorRef > 0 ? `${brl.format(valorRef)}/pç` : "—"}
                </Td>
                <Td>
                  <Badge tone={t.ativo ? "mint" : "mute"}>
                    {t.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      ) : (
        <Empty
          title="Nenhum terceirizado encontrado"
          hint={
            q || status !== "todos" || opsFiltro !== "todas" || servicoFiltro !== "todos"
              ? "Ajuste os filtros ou a busca."
              : "Cadastre o primeiro parceiro com o botão Novo."
          }
        />
      )}

      {rows.length ? (
        <p className="text-[11px] text-faint">
          {nInt.format(rows.length)} de {nInt.format(base.length)} terceirizado
          {base.length === 1 ? "" : "s"}
        </p>
      ) : null}
      </>
      ) : null}
    </div>
  );
}
