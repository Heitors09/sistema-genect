import { redirect } from "next/navigation";

export default function CategoriasRedirect() {
  redirect("/financeiro/plano-gerencial?tab=categorias");
}
