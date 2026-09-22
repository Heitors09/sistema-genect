import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="text-sm text-mute">Página não encontrada</p>
        <Link href="/" className="mt-2 inline-block text-ink underline-offset-4 hover:underline">
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
