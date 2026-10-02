export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export async function lookupCnpj(cnpj: string) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    razao_social?: string;
    nome_fantasia?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
  };
  return {
    nome: data.nome_fantasia || data.razao_social || "",
    razaoSocial: data.razao_social || "",
    endereco: [data.logradouro, data.numero, data.bairro].filter(Boolean).join(", "),
    cidade: data.municipio || "",
    uf: data.uf || "",
  };
}
