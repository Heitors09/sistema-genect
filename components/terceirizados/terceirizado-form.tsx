"use client";

import { useState } from "react";
import { parseBRL, uid } from "@/lib/format";
import { useStore } from "@/lib/store/store";
import { Button, Field, Input } from "../ui";

export function TerceirizadoForm({
  onSaved,
}: {
  onSaved?: (id: string) => void;
}) {
  const { dispatch, isAdmin } = useStore();
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [valor, setValor] = useState("");
  const [error, setError] = useState("");

  if (!isAdmin) return null;

  function save() {
    if (!nome.trim()) {
      setError("Informe o nome");
      return;
    }
    const id = uid("ter");
    dispatch({
      type: "SAVE_TERCEIRIZADO",
      terceirizado: {
        id,
        nome: nome.trim(),
        especialidade: especialidade.trim(),
        valorPorPeca: parseBRL(valor) || 0,
        ativo: true,
      },
    });
    setNome("");
    setEspecialidade("");
    setValor("");
    setError("");
    onSaved?.(id);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome" error={error}>
          <Input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (error) setError("");
            }}
            placeholder="Ex.: Costura da Ana"
          />
        </Field>
        <Field label="Especialidade" hint="Opcional">
          <Input
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
            placeholder="Montagem e costura plana"
          />
        </Field>
        <Field label="Valor por peça" hint="Opcional">
          <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={save}>
          Adicionar terceirizado
        </Button>
      </div>
    </div>
  );
}
