import type { Metadata } from "next";
import { ClienteForm } from "@/components/admin/cliente-form";
import { ClientesTable } from "@/components/admin/clientes-table";
import { PageHeader } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/server";
import type { ClienteComProjetos } from "@/lib/types";

export const metadata: Metadata = { title: "Cadastro de Clientes & Sites" };

export default async function ClientesPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("clientes")
    .select("*, projetos(*)")
    .order("created_at", { ascending: false })
    .returns<ClienteComProjetos[]>();

  const clientes = data ?? [];
  const totalProjetos = clientes.reduce((s, c) => s + (c.projetos?.length ?? 0), 0);
  const sitesAtivos = clientes.reduce(
    (s, c) => s + (c.projetos?.filter((p) => p.status === "ativo").length ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastro de Clientes & Sites"
        subtitle={`${clientes.length} clientes · ${totalProjetos} sites cadastrados (${sitesAtivos} ativos)`}
      />

      <ClienteForm />

      <ClientesTable clientes={clientes} />
    </div>
  );
}