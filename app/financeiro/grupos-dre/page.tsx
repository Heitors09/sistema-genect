import { redirect } from "next/navigation";

export default function GruposDreRedirect() {
  redirect("/financeiro/plano-gerencial?tab=grupos");
}
