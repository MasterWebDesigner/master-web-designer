"use client";

import { useMemo, useState, useTransition } from "react";
import { atualizarStatusProjeto, excluirCliente } from "@/app/actions";
import { ClienteForm } from "@/components/admin/cliente-form";
import { Card } from "@/components/admin/ui";
import { CodeIcon, GlobeIcon, PencilIcon, SearchIcon, ServerIcon, TrashIcon } from "@/components/icons";
import type { Cliente, ClienteComProjetos, Projeto, ProjetoStatus } from "@/lib/types";
import { cn, formatBRL, labelProjetoStatus, PROJETO_STATUS_OPTIONS } from "@/lib/utils";

type Linha = { cliente: Cliente; projeto: Projeto | null };

function StatusSelect({ projeto }: { projeto: Projeto }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={projeto.status}
      disabled={pending}
      onChange={(e) => {
        const value = e.currentTarget.value as ProjetoStatus;
        startTransition(async () => {
          await atualizarStatusProjeto(projeto.id, value);
        });
      }}
      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition focus:border-[#8B5CF6]/60 disabled:opacity-60"
    >
      {PROJETO_STATUS_OPTIONS.map((s) => (
        <option key={s} value={s} className="bg-[#0F172A]">
          {labelProjetoStatus(s)}
        </option>
      ))}
    </select>
  );
}

function AcoesLinha({
  linha,
  onEdit,
  onExcluir,
  pending,
}: {
  linha: Linha;
  onEdit: (linha: Linha) => void;
  onExcluir: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onEdit(linha)}
        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:border-[#8B5CF6]/50 hover:text-white"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        Editar
      </button>
      <button
        onClick={onExcluir}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 bg-red-400/5 px-2.5 py-1.5 text-[11px] font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-400/10 disabled:opacity-50"
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Excluir
      </button>
    </div>
  );
}

export function ClientesTable({ clientes }: { clientes: ClienteComProjetos[] }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<ProjetoStatus | "">("");
  const [editando, setEditando] = useState<Linha | null>(null);
  const [pending, startTransition] = useTransition();

  const linhas = useMemo<Linha[]>(() => {
    const out: Linha[] = [];
    for (const c of clientes) {
      const projetos = c.projetos ?? [];
      if (!projetos.length) {
        out.push({ cliente: c, projeto: null });
      } else {
        for (const p of projetos) out.push({ cliente: c, projeto: p });
      }
    }
    return out;
  }, [clientes]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    return linhas.filter(({ cliente, projeto }) => {
      const dominio = projeto?.dominio ?? "";
      const matchesQuery =
        !q ||
        cliente.nome.toLowerCase().includes(q) ||
        (cliente.email ?? "").toLowerCase().includes(q) ||
        (projeto?.nome_site ?? "").toLowerCase().includes(q) ||
        dominio.toLowerCase().includes(q);
      const matchesStatus = !filtro || projeto?.status === filtro;
      return matchesQuery && matchesStatus;
    });
  }, [linhas, query, filtro]);

  const excluir = (c: Cliente) => {
    if (!window.confirm(`Excluir ${c.nome}?\n\nOs sites e faturas deste cliente também serão removidos.`)) return;
    startTransition(async () => {
      await excluirCliente(c.id);
    });
  };

  return (
    <>
      {editando && (
        <div className="mb-6">
          <ClienteForm
            key={editando.cliente.id + (editando.projeto?.id ?? "")}
            cliente={editando.cliente}
            projeto={editando.projeto}
            onDone={() => setEditando(null)}
          />
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Busca e filtros */}
        <div className="flex flex-col gap-3 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por cliente, e-mail, site ou domínio..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 transition focus:border-[#8B5CF6]/60"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["", ...PROJETO_STATUS_OPTIONS] as (ProjetoStatus | "")[]).map((s) => (
              <button
                key={s || "todos"}
                onClick={() => setFiltro(s)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                  filtro === s
                    ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                )}
              >
                {s === "" ? "Todos" : labelProjetoStatus(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Cliente / Empresa</th>
                <th className="px-5 py-4 font-semibold">Site</th>
                <th className="px-5 py-4 font-semibold">Código / Servidor</th>
                <th className="px-5 py-4 font-semibold">Mensalidade</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtradas.map((linha) => {
                const { cliente, projeto } = linha;
                return (
                  <tr key={cliente.id + (projeto?.id ?? "sem-projeto")} className="transition hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{cliente.nome}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {cliente.email || "—"}
                        {cliente.telefone_whatsapp ? ` · ${cliente.telefone_whatsapp}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {projeto?.dominio ? (
                        <a
                          href={"https://" + projeto.dominio.replace(/^https?:\/\//, "")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3B82F6] hover:underline"
                        >
                          <GlobeIcon className="h-3.5 w-3.5" />
                          {projeto.dominio}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                      {projeto && (
                        <p className="mt-0.5 text-[11px] text-slate-500">{projeto.nome_site}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        {projeto?.repo_github ? (
                          <a
                            href={projeto.repo_github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                          >
                            <CodeIcon className="h-3.5 w-3.5" />
                            GitHub
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <ServerIcon className="h-3.5 w-3.5" />
                          {projeto?.servidor || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-white">
                        {projeto && Number(projeto.valor_mensalidade) > 0
                          ? formatBRL(Number(projeto.valor_mensalidade))
                          : "—"}
                      </span>
                      {projeto && Number(projeto.valor_mensalidade) > 0 && (
                        <p className="text-[11px] text-slate-500">dia {projeto.dia_vencimento}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {projeto ? (
                        <StatusSelect projeto={projeto} />
                      ) : (
                        <span className="text-xs text-slate-600">Sem site</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <AcoesLinha
                        linha={linha}
                        onEdit={setEditando}
                        onExcluir={() => excluir(cliente)}
                        pending={pending}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filtradas.length && (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-slate-400">Nenhum cliente encontrado.</p>
            <p className="mt-1 text-xs text-slate-600">Ajuste a busca ou cadastre um novo cliente e site.</p>
          </div>
        )}
      </Card>
    </>
  );
}