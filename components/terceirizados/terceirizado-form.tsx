"use client";

import { useState } from "react";
import { parseBRL, uid } from "@/lib/format";
import { useStore } from "@/lib/store/store";
import { Button, Field, Input } from "../ui";

export function TerceirizadoForm({ onSaved }: { onSaved?: (id: string) => void }) {
  const { dispatch, isAdmin } = useStore();
  const [nome, setNome] = useState("");
  const [servicos, setServicos] = useState([{ nome: "", valor: "" }]);
  const [error, setError] = useState("");

  if (!isAdmin) return null;

  function save() {
    if (!nome.trim()) {
      setError("Informe o nome");
      return;
    }
    const id = uid("ter");
    const lista = servicos
      .filter((s) => s.nome.trim())
      .map((s) => ({ id: uid("svc"), nome: s.nome.trim(), valorPorPeca: parseBRL(s.valor) || 0 }));
    dispatch({
      type: "SAVE_TERCEIRIZADO",
      terceirizado: {
        id,
        nome: nome.trim(),
        servicos: lista,
        especialidade: lista.map((s) => s.nome).join(", "),
        valorPorPeca: lista[0]?.valorPorPeca ?? 0,
        ativo: true,
      },
    });
    setNome("");
    setServicos([{ nome: "", valor: "" }]);
    setError("");
    onSaved?.(id);
  }

  return (
    <div className="space-y-4">
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
      <div>
        <p className="kicker mb-2">Serviços</p>
        {servicos.map((s, i) => (
          <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
            <Field label={i === 0 ? "Serviço" : ""}>
              <Input
                value={s.nome}
                onChange={(e) => setServicos((p) => p.map((x, idx) => (idx === i ? { ...x, nome: e.target.value } : x)))}
                placeholder="Costura reta"
              />
            </Field>
            <Field label={i === 0 ? "Valor por peça" : ""}>
              <Input
                value={s.valor}
                onChange={(e) => setServicos((p) => p.map((x, idx) => (idx === i ? { ...x, valor: e.target.value } : x)))}
                placeholder="0,00"
              />
            </Field>
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => setServicos((p) => [...p, { nome: "", valor: "" }])}>
          Adicionar serviço
        </Button>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={save}>
          Adicionar terceirizado
        </Button>
      </div>
    </div>
  );
}
