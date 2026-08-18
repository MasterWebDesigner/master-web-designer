import type { Metadata } from "next";
import { FaturasTable } from "@/components/admin/faturas-table";
import { MensalidadeForm } from "@/components/admin/mensalidade-form";
import { Badge, Card, PageHeader, StatCard } from "@/components/admin/ui";
import { AlertIcon, CashIcon, CheckIcon } from "@/components/icons";
import { buscarFaturasDoMes, gerarFaturasDoMes } from "@/lib/financeiro";
import { createClient } from "@/lib/supabase/server";
import type { ProjetoResumo } from "@/lib/types";
import { formatBRL, labelProjetoStatus, mesAnoLabel, periodoAtualISO, STATUS_PAGAMENTO } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard de Faturamento" };

export default async function FinanceiroPage() {
  const supabase = createClient();
  await gerarFaturasDoMes();

  const periodo = periodoAtualISO();

  // Consulta única: cards e tabela "Cobranças do mês" leem exatamente o mesmo resultado.
  const faturas = await buscarFaturasDoMes(periodo);

  const faturadoMes = faturas.filter((f) => f.status_pagamento === "pago").reduce((s, f) => s + Number(f.valor), 0);
  const aReceber = faturas
    .filter((f) => f.status_pagamento !== "pago")
    .reduce((s, f) => s + Number(f.valor), 0);
  const inadimplentes = new Set(
    faturas.filter((f) => f.status_pagamento === "atrasado").map((f) => f.cliente_id)
  ).size;

  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, cliente_id, nome_site, dominio, valor_mensalidade, dia_vencimento, status, clientes(nome)")
    .order("nome_site")
    .returns<(ProjetoResumo & { clientes: { nome: string } | null })[]>();

  const projetosForm = (projetos ?? []).map((p) => ({
    id: p.id,
    cliente_id: p.cliente_id,
    nome_site: p.nome_site,
    dominio: p.dominio,
    valor_mensalidade: Number(p.valor_mensalidade),
    dia_vencimento: p.dia_vencimento,
    status: p.status,
    cliente_nome: p.clientes?.nome ?? "Sem cliente",
  }));

  const planosVigentes = projetosForm.filter((p) => p.status === "ativo" && Number(p.valor_mensalidade) > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de Faturamento"
        subtitle={`Faturas e mensalidades · ${mesAnoLabel(periodo)}`}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          icon={<CashIcon className="h-5 w-5" />}
          label="Total faturado no mês"
          value={formatBRL(faturadoMes)}
          accent="neon"
          hint={"Competência " + mesAnoLabel(periodo)}
        />
        <StatCard
          icon={<CheckIcon className="h-5 w-5" />}
          label="Total a receber"
          value={formatBRL(aReceber)}
          accent="electric"
          hint="Pendente + atrasado"
        />
        <StatCard
          icon={<AlertIcon className="h-5 w-5" />}
          label="Clientes inadimplentes"
          value={inadimplentes}
          accent="red"
          hint="Com cobrança em atraso"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <FaturasTable faturas={faturas} label={mesAnoLabel(periodo)} />
        </div>

        <div className="flex flex-col gap-5">
          <MensalidadeForm projetos={projetosForm} />

          <Card className="p-6">
            <h3 className="font-bold text-white">Planos vigentes</h3>
            <p className="mt-1 text-xs text-slate-500">
              Sites ativos com mensalidade vinculada.
            </p>
            <div className="mt-4 space-y-3">
              {planosVigentes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{p.nome_site}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.cliente_nome} · vence dia {p.dia_vencimento} de cada mês
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-white">
                      {formatBRL(Number(p.valor_mensalidade))}/mês
                    </span>
                    <Badge className={STATUS_PAGAMENTO["pendente"]}>
                      {labelProjetoStatus(p.status)}
                    </Badge>
                  </div>
                </div>
              ))}
              {!planosVigentes.length && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Nenhum plano ativo cadastrado ainda.
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-1 flex-col justify-center p-6">
            <h3 className="font-bold text-white">Integração PIX automática</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Configure <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">ASSAAS_API_KEY</code> e{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">ASSAAS_WEBHOOK_SECRET</code> no{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">.env.local</code>. O botão{" "}
              <strong className="text-slate-200">PIX</strong> em cada fatura gera a cobrança (preenchendo{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">gateway_id</code> e{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">link_pix_boleto</code>) e o webhook{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[#3B82F6]">/api/webhooks/asaas</code>{" "}
              dá baixa automática quando o Pix for pago.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}