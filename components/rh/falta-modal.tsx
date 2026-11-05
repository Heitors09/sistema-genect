"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { brl, formatDate, todayISO, uid } from "@/lib/format";
import { useStore } from "@/lib/store/store";
import { Badge, Button, DateInput, Field, Input, Modal, Select } from "../ui";

/** Registrar falta: falta não justificada desconta 1/30 do salário do mês. */
export function FaltaModal({
  funcionarioId: inicial,
  onClose,
}: {
  funcionarioId?: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useStore();
  const ativos = state.funcionarios.filter((f) => !f.dataDemissao || f.dataDemissao >= todayISO());
  const [funcionarioId, setFuncionarioId] = useState(inicial ?? ativos[0]?.id ?? "");
  const [data, setData] = useState(todayISO());
  const [justificada, setJustificada] = useState(false);
  const [motivo, setMotivo] = useState("");
  const f = state.funcionarios.find((x) => x.id === funcionarioId);
  const historico = state.faltas
    .filter((x) => x.funcionarioId === funcionarioId)
    .sort((a, b) => b.data.localeCompare(a.data));
  const descontoDia = f ? f.salarioMensal / 30 : 0;

  return (
    <Modal open title="Controle de faltas" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!f) return;
          dispatch({
            type: "SAVE_FALTA",
            falta: {
              id: uid("fal"),
              funcionarioId: f.id,
              data,
              competencia: data.slice(0, 7),
              justificada,
              motivo: motivo.trim() || undefined,
            },
          });
          setMotivo("");
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Funcionário">
            <Select value={funcionarioId} onChange={(e) => setFuncionarioId(e.target.value)}>
              {ativos.map((x) => (
                <option key={x.id} value={x.id}>{x.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Data da falta">
            <DateInput value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Field label="Situação" hint={justificada ? "Sem desconto" : `Desconta ${brl.format(descontoDia)} do salário`}>
            <Select value={justificada ? "sim" : "nao"} onChange={(e) => setJustificada(e.target.value === "sim")}>
              <option value="nao">Não justificada</option>
              <option value="sim">Justificada (atestado etc.)</option>
            </Select>
          </Field>
          <Field label="Motivo" hint="Opcional">
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!f}>Registrar falta</Button>
        </div>
      </form>

      <div className="mt-4">
        <p className="kicker mb-2">Histórico de {f?.nome ?? "—"}</p>
        {historico.length ? (
          <ul className="divide-y divide-line rounded-md border border-line">
            {historico.map((x) => (
              <li key={x.id} className="flex items-center gap-2 px-3 py-1.5 text-[12px]">
                <span className="tabular-nums">{formatDate(x.data)}</span>
                <Badge tone={x.justificada ? "mute" : "rose"}>{x.justificada ? "Justificada" : "Desconta"}</Badge>
                <span className="min-w-0 flex-1 truncate text-faint">{x.motivo ?? ""}</span>
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-elevated hover:text-rose"
                  aria-label="Remover falta"
                  onClick={() => dispatch({ type: "REMOVE_FALTA", id: x.id })}
                >
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-faint">Nenhuma falta registrada.</p>
        )}
      </div>
    </Modal>
  );
}
