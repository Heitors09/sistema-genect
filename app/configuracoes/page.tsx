"use client";

import { Button, Card, PageHeader } from "@/components/ui";
import { STORE_KEY } from "@/lib/store/seed";
import { useStore } from "@/lib/store/store";

export default function ConfigPage() {
  const { currentUser, isAdmin } = useStore();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        kicker="Sistema"
        title="Configurações"
        description="Sessão local, perfil de acesso e preservação dos fatos financeiros."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4 text-[13px]">
          <p className="kicker">Sessão</p>
          <p className="mt-2">{currentUser.nome}</p>
          <p className="text-mute">{currentUser.email}</p>
          <p className="mt-1 text-faint">{isAdmin ? "Administrador da confecção" : "Terceirizado"}</p>
        </Card>
        <Card className="p-4 text-[13px]">
          <p className="kicker">Regras do produto</p>
          <ul className="mt-2 space-y-1 text-mute">
            <li>Cadastro único — sem redigitação.</li>
            <li>Fatos financeiros não são apagados; correção via estorno total.</li>
            <li>DRE e fluxo de caixa permanecem visões distintas.</li>
            <li>OP ≠ faturamento ≠ caixa ≠ receita.</li>
          </ul>
          <Button
            className="mt-4"
            variant="ghost"
            onClick={() => {
              localStorage.removeItem(STORE_KEY);
              window.location.reload();
            }}
          >
            Restaurar dados de demonstração
          </Button>
        </Card>
      </div>
    </div>
  );
}
