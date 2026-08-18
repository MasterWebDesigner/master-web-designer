"use client";

import { useState } from "react";
import { definirMensalidade } from "@/app/actions";
import { Card } from "@/components/admin/ui";
import type { ProjetoComCliente } from "@/lib/types";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-[#8B5CF6]/60 focus:bg-white/[0.07]";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";

export function MensalidadeForm({ projetos }: { projetos: ProjetoComCliente[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [projetoId, setProjetoId] = useState("");
  const selecionado = projetoId ? projetos.find((p) => p.id === projetoId) : undefined;
  const valorAtual = selecionado && Number(selecionado.valor_mensalidade) > 0
    ? Number(selecionado.valor_mensalidade).toFixed(2).replace(".", ",")
    : "";

  return (
    <Card className="p-6">
      <h3 className="font-bold text-white">Vincular / Editar Mensalidade</h3>
      <p className="mt-1 text-xs text-slate-500">
        Selecione o site: o valor atual é preenchido automaticamente para você corrigir e salvar.
      </p>

      <form
        action={definirMensalidade}
        onSubmit={() => {
          setMsg("Mensalidade salva! A fatura do mês foi gerada/atualizada.");
          setTimeout(() => setMsg(null), 5000);
        }}
        className="mt-5 space-y-4"
      >
        <div>
          <label htmlFor="projeto_id" className={labelClass}>
            Site *
          </label>
          <select
            id="projeto_id"
            name="projeto_id"
            required
            value={projetoId}
            onChange={(e) => {
              setProjetoId(e.target.value);
              setMsg(null);
            }}
            className={inputClass}
          >
            <option value="" disabled className="bg-[#0F172A]">
              Selecione um site...
            </option>
            {projetos.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0F172A]">
                {p.cliente_nome} — {p.nome_site}
                {Number(p.valor_mensalidade) > 0
                  ? ` (atual: R$ ${Number(p.valor_mensalidade).toFixed(2).replace(".", ",")})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="valor_mensalidade" className={labelClass}>
              Valor mensal (R$) *
            </label>
            <input
              id="valor_mensalidade"
              name="valor_mensalidade"
              type="text"
              inputMode="decimal"
              required
              key={`valor-${projetoId}`}
              defaultValue={valorAtual}
              placeholder="150,00"
              className={inputClass}
            />
            {selecionado && (
              <p className="mt-1 text-[11px] text-slate-500">
                {valorAtual
                  ? `Valor atual: R$ ${valorAtual} — edite e salve para trocar.`
                  : "Site sem mensalidade — digite o valor para iniciar."}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="dia_vencimento" className={labelClass}>
              Dia do vencimento
            </label>
            <input
              id="dia_vencimento"
              name="dia_vencimento"
              type="number"
              min="1"
              max="31"
              key={`venc-${projetoId}`}
              defaultValue={selecionado?.dia_vencimento ?? 10}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] py-3 text-sm font-bold text-white transition hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
        >
          {valorAtual ? "Salvar novo valor" : "Vincular mensalidade"}
        </button>
      </form>

      {msg && (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          {msg}
        </p>
      )}
    </Card>
  );
}