"use client";

import { useState } from "react";
import { atualizarCliente, criarCliente } from "@/app/actions";
import { PlusIcon, XIcon } from "@/components/icons";
import type { Cliente, Projeto } from "@/lib/types";
import { PROJETO_STATUS_OPTIONS } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 transition focus:border-[#8B5CF6]/60 focus:bg-white/[0.07]";

const labelClass = "mb-2 block text-sm font-medium text-slate-300";

function fmtValor(v: number | null | undefined): string {
  return v && Number(v) > 0 ? Number(v).toFixed(2).replace(".", ",") : "";
}

export function ClienteForm({
  cliente,
  projeto,
  onDone,
}: {
  cliente?: Cliente | null;
  projeto?: Projeto | null;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(Boolean(cliente));
  const [salvo, setSalvo] = useState(false);

  const editando = Boolean(cliente);

  const fechar = () => {
    setOpen(false);
    onDone?.();
  };

  if (!open) {
    if (editando) return null;

    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] px-5 py-2.5 text-sm font-bold text-white transition hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
      >
        <PlusIcon className="h-4 w-4" />
        Novo Cliente + Site
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#8B5CF6]/20 bg-card/60 p-6 backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-white">
            {editando ? "Editar cliente e site" : "Cadastrar cliente e site"}
          </h2>
          <p className="text-xs text-slate-500">
            Campos marcados com * são obrigatórios. Mensalidade e vencimento geram a cobrança do mês.
          </p>
        </div>
        <button
          onClick={fechar}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:text-white"
          aria-label="Fechar formulário"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <form
        action={editando ? atualizarCliente : criarCliente}
        onSubmit={() => {
          setSalvo(true);
          setTimeout(() => setSalvo(false), 4000);
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        {editando && (
          <>
            <input type="hidden" name="id" value={cliente!.id} />
            {projeto && <input type="hidden" name="projeto_id" value={projeto.id} />}
          </>
        )}

        <div className="sm:col-span-2">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8B5CF6]">
            Dados do Cliente
          </h3>
        </div>

        <div>
          <label htmlFor="nome" className={labelClass}>
            Nome do Cliente / Empresa *
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            placeholder="Ex: Maxwell Nascimento"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={cliente?.email ?? ""}
            placeholder="contato@empresa.com.br"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="telefone_whatsapp" className={labelClass}>
            WhatsApp
          </label>
          <input
            id="telefone_whatsapp"
            name="telefone_whatsapp"
            defaultValue={cliente?.telefone_whatsapp ?? ""}
            placeholder="(11) 99999-9999"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cpf_cnpj" className={labelClass}>
            CPF / CNPJ
          </label>
          <input
            id="cpf_cnpj"
            name="cpf_cnpj"
            defaultValue={cliente?.cpf_cnpj ?? ""}
            placeholder="000.000.000-00"
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <h3 className="mb-3 mt-2 text-xs font-bold uppercase tracking-widest text-[#3B82F6]">
            Dados do Site / Recorrência
          </h3>
        </div>

        <div>
          <label htmlFor="nome_site" className={labelClass}>
            Nome do Site *
          </label>
          <input
            id="nome_site"
            name="nome_site"
            required
            defaultValue={projeto?.nome_site ?? cliente?.nome ?? ""}
            placeholder="Ex: Site Institucional"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="dominio" className={labelClass}>
            Domínio
          </label>
          <input
            id="dominio"
            name="dominio"
            defaultValue={projeto?.dominio ?? ""}
            placeholder="www.empresa.com.br"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="repo_github" className={labelClass}>
            Repositório GitHub
          </label>
          <input
            id="repo_github"
            name="repo_github"
            defaultValue={projeto?.repo_github ?? ""}
            placeholder="https://github.com/usuario/repo"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="servidor" className={labelClass}>
            Servidor
          </label>
          <input
            id="servidor"
            name="servidor"
            defaultValue={projeto?.servidor ?? ""}
            placeholder="Hostinger / Vercel / Outro"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="valor_mensalidade" className={labelClass}>
            Mensalidade (R$)
          </label>
          <input
            id="valor_mensalidade"
            name="valor_mensalidade"
            type="text"
            inputMode="decimal"
            defaultValue={projeto ? fmtValor(projeto.valor_mensalidade) : ""}
            placeholder="150,00"
            className={inputClass}
          />
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
            defaultValue={projeto?.dia_vencimento ?? 10}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="status" className={labelClass}>
            Status do Site
          </label>
          <select
            id="status"
            name="status"
            defaultValue={projeto?.status ?? "ativo"}
            className={inputClass}
          >
            {PROJETO_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-[#0F172A]">
                {s === "ativo" ? "Ativo (fatura cobrada)" : "Suspenso (sem cobrança)"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] py-3 text-sm font-bold text-white transition hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]"
          >
            {editando ? "Salvar Alterações" : "Salvar Cliente + Site"}
          </button>
          <button
            type="button"
            onClick={fechar}
            className="rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </form>

      {salvo && (
        <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          {editando ? "Cadastro atualizado! A listagem será atualizada automaticamente." : "Cliente e site cadastrados! A cobrança do mês foi gerada."}
        </p>
      )}
    </div>
  );
}