import { redirect } from "next/navigation";

export default function PlanoContasRedirect() {
  redirect("/financeiro/plano-gerencial?tab=plano");
}
