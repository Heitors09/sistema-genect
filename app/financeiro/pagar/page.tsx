import { redirect } from "next/navigation";

export default function PagarRedirect() {
  redirect("/financeiro/despesas");
}
