import type { Metadata } from "next";
import { Badge, Card, PageHeader, StatCard } from "@/components/admin/ui";
import { CashIcon, CheckIcon, GlobeIcon, UsersIcon } from "@/components/icons";
import { buscarFaturasDoMes, gerarFaturasDoMes } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import type { ClienteComProjetos, FaturaComRelacoes } from "@/lib/types";
import { formatBRL, formatDateBR, labelPagamento, labelProjetoStatus, mesAnoLabel, periodoAtualISO, STATUS_PAGAMENTO, STATUS_PROJETO } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = createClient();
  await gerarFaturasDoMes();

  const { count: totalClientes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });
  const { count: sitesAtivos } = await supabase
    .from("projetos")
    .select("*", { count: "exact", head: true })
    .eq("status", "ativo");

  const periodo = periodoAtualISO();

  // Mesma consulta canônica usada no Dashboard de Faturamento.
  const faturasMes = await buscarFaturasDoMes(periodo);

  const receitaMes = faturasMes.filter((f) => f.status_pagamento === "pago").reduce((s, f) => s + Number(f.valor), 0);
  const aReceber = faturasMes.filter((f) => f.status_pagamento !== "pago").reduce((s, f) => s + Number(f.valor), 0);

  const { data: faturasRecentes } = await supabase
    .from("faturas")
    .select("*, clientes!faturas_cliente_fk(id, nome, telefone_whatsapp), projetos(id, nome_site, dominio, valor_mensalidade, dia_vencimento, status)")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<FaturaComRelacoes[]>();

  const { data: clientesRecentes } = await supabase
    .from("clientes")
    .select("*, projetos(*)")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<ClienteComProjetos[]>();

  const subtitulo = `Visão geral do seu negócio · ${mesAnoLabel(periodo)}`;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={subtitulo} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<UsersIcon className="h-5 w-5" />}
          label="Clientes cadastrados"
          value={totalClientes ?? 0}
          accent="neon"
          hint="Contratantes da agência"
        />
        <StatCard
          icon={<GlobeIcon className="h-5 w-5" />}
          label="Sites ativos"
          value={sitesAtivos ?? 0}
          accent="emerald"
          hint="Projetos em cobrança"
        />
        <StatCard
          icon={<CheckIcon className="h-5 w-5" />}
          label="Receita no mês"
          value={formatBRL(receitaMes)}
          accent="electric"
          hint={"Já recebido em " + mesAnoLabel(periodo)}
        />
        <StatCard
          icon={<CashIcon className="h-5 w-5" />}
          label="A receber"
          value={formatBRL(aReceber)}
          accent="amber"
          hint="Pendente + em atraso"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <h3 className="border-b border-white/5 p-5 font-bold text-white">Cobranças recentes</h3>
          <div className="divide-y divide-white/5">
            {(faturasRecentes ?? []).map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {f.projetos?.nome_site ?? f.clientes?.nome ?? "Projeto removido"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {f.projetos?.dominio ?? "—"} · Vence {formatDateBR(f.data_vencimento)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-white">{formatBRL(Number(f.valor))}</span>
                  <Badge className={STATUS_PAGAMENTO[f.status_pagamento]}>
                    {labelPagamento(f.status_pagamento)}
                  </Badge>
                </div>
              </div>
            ))}
            {!(faturasRecentes ?? []).length && (
              <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhuma cobrança ainda.</p>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <h3 className="border-b border-white/5 p-5 font-bold text-white">Últimos clientes</h3>
          <div className="divide-y divide-white/5">
            {(clientesRecentes ?? []).map((c) => {
              const projeto = (c.projetos ?? [])[0];
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{c.nome}</p>
                    <p className="truncate text-xs text-slate-500">{projeto?.dominio ?? "Sem site cadastrado"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-bold text-white">
                      {projeto && Number(projeto.valor_mensalidade) > 0
                        ? formatBRL(Number(projeto.valor_mensalidade)) + "/mês"
                        : "—"}
                    </span>
                    {projeto ? (
                      <Badge className={STATUS_PROJETO[projeto.status]}>
                        {labelProjetoStatus(projeto.status)}
                      </Badge>
                    ) : (
                      <Badge className="border-white/10 bg-white/5 text-slate-400">—</Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {!(clientesRecentes ?? []).length && (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Cadastre seu primeiro cliente em Cadastro de Clientes & Sites.
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}