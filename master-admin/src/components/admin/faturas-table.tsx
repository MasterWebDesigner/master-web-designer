"use client";

import { useState, useTransition, type ReactNode } from "react";
import { atualizarFatura, gerarCobrancaFaturaPix, marcarFatura } from "@/app/actions";
import { Badge, Card } from "@/components/admin/ui";
import { AlertIcon, CheckIcon, ClockIcon, PencilIcon, XIcon } from "@/components/icons";
import type { FaturaComRelacoes, PagamentoStatus } from "@/lib/types";
import { cn, formatBRL, formatDateBR, labelPagamento, STATUS_PAGAMENTO } from "@/lib/utils";

function FaturaRow({ fatura }: { fatura: FaturaComRelacoes }) {
  const [editando, setEditando] = useState(false);
  const [pending, startTransition] = useTransition();

  const setStatus = (status: PagamentoStatus) => {
    startTransition(async () => {
      await marcarFatura(fatura.id, status);
    });
  };

  const gerarPix = () => {
    startTransition(async () => {
      await gerarCobrancaFaturaPix(fatura.id);
    });
  };

  const salvarEdicao = (formData: FormData) => {
    startTransition(async () => {
      await atualizarFatura(formData);
      setEditando(false);
    });
  };

  const acoes: { status: PagamentoStatus; label: string; icon: ReactNode; active: string }[] = [
    {
      status: "pago",
      label: "Pago",
      icon: <CheckIcon className="h-3.5 w-3.5" />,
      active: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    },
    {
      status: "pendente",
      label: "Pendente",
      icon: <ClockIcon className="h-3.5 w-3.5" />,
      active: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    },
    {
      status: "atrasado",
      label: "Atraso",
      icon: <AlertIcon className="h-3.5 w-3.5" />,
      active: "border-red-400/40 bg-red-400/10 text-red-300",
    },
  ];

  return (
    <>
    <tr className="transition hover:bg-white/[0.03]">
      <td className="px-4 py-4">
        <p className="font-semibold text-white">
          {fatura.projetos?.nome_site ?? fatura.clientes?.nome ?? "Site removido"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {fatura.clientes?.nome ?? "—"}
          {fatura.clientes?.telefone_whatsapp ? ` · ${fatura.clientes.telefone_whatsapp}` : ""}
        </p>
      </td>
      <td className="px-4 py-4">
        <span className="font-bold text-white">{formatBRL(Number(fatura.valor))}</span>
        {fatura.gateway_id && (
          <p className="mt-0.5 text-[11px] text-[#3B82F6]">Asaas: #{fatura.gateway_id}</p>
        )}
        {fatura.link_pix_boleto && (
          <a
            href={fatura.link_pix_boleto}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block truncate text-[11px] text-[#3B82F6] hover:underline"
          >
            Abrir link de pagamento
          </a>
        )}
      </td>
      <td className="px-4 py-4 text-sm text-slate-300">{formatDateBR(fatura.data_vencimento)}</td>
      <td className="px-4 py-4">
        <Badge className={STATUS_PAGAMENTO[fatura.status_pagamento]}>
          {labelPagamento(fatura.status_pagamento)}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={gerarPix}
            disabled={pending || fatura.status_pagamento === "pago"}
            title="Gerar cobrança PIX no Asaas"
            className="inline-flex items-center gap-1 rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#3B82F6] transition hover:bg-[#3B82F6]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            PIX
          </button>
          <button
            onClick={() => setEditando((v) => !v)}
            disabled={pending}
            title="Editar valor e vencimento"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
              editando
                ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-white"
                : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
            )}
          >
            {editando ? <XIcon className="h-3.5 w-3.5" /> : <PencilIcon className="h-3.5 w-3.5" />}
            {editando ? "Fechar" : "Editar"}
          </button>
          {acoes.map((acao) => (
            <button
              key={acao.status}
              disabled={pending || fatura.status_pagamento === acao.status}
              onClick={() => setStatus(acao.status)}
              title={`Marcar como ${acao.label}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed",
                fatura.status_pagamento === acao.status
                  ? acao.active
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
              )}
            >
              {acao.icon}
              {acao.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
    {editando && (
      <tr className="bg-[#8B5CF6]/[0.04]">
        <td colSpan={5} className="px-4 py-4">
          <form action={salvarEdicao} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={fatura.id} />
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Valor (R$)
              </label>
              <input
                name="valor"
                type="text"
                inputMode="decimal"
                required
                defaultValue={Number(fatura.valor).toFixed(2).replace(".", ",")}
                placeholder="150,00"
                className="w-44 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#8B5CF6]/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Vencimento
              </label>
              <input
                name="data_vencimento"
                type="date"
                required
                defaultValue={fatura.data_vencimento.slice(0, 10)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#8B5CF6]/60"
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                disabled={pending}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </td>
      </tr>
    )}
    </>
  );
}

export function FaturasTable({
  faturas,
  label,
}: {
  faturas: FaturaComRelacoes[];
  label: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 p-5">
        <h3 className="font-bold text-white">Cobranças do mês</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          {label} · {faturas.length} cobrança(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-4 font-semibold">Site</th>
              <th className="px-4 py-4 font-semibold">Valor</th>
              <th className="px-4 py-4 font-semibold">Vencimento</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {faturas.map((f) => (
              <FaturaRow key={f.id} fatura={f} />
            ))}
          </tbody>
        </table>
      </div>

      {!faturas.length && (
        <div className="px-5 py-14 text-center">
          <p className="text-sm font-medium text-slate-400">Nenhuma cobrança neste mês.</p>
          <p className="mt-1 text-xs text-slate-600">
            Vincule uma mensalidade a um site ativo para gerar a fatura automaticamente.
          </p>
        </div>
      )}
    </Card>
  );
}