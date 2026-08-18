"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sincronizarFaturaDoMes } from "@/lib/financeiro";
import { periodoAtualISO, vencimentoISO } from "@/lib/utils";
import type { LoginState, PagamentoStatus, ProjetoStatus } from "@/lib/types";

function parseValorBRL(raw: string): number {
  let s = raw.replace(/[^\d.,]+/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return Number(s);
}

function clampDia(raw: FormDataEntryValue | null, fallback = 10): number {
  return Math.min(31, Math.max(1, Number(String(raw ?? "")) || fallback));
}

function revalidar() {
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
}

// =====================================================
// AUTH
// =====================================================

export async function entrarNoSistema(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const code = error?.code ?? error?.message ?? "";
    if (code.includes("email_not_confirmed") || code.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Seu e-mail ainda não foi confirmado. Confirme no link enviado ou rode no SQL Editor: update auth.users set email_confirmed_at = now() where email = '" +
          email +
          "';",
      };
    }
    return { error: "Credenciais inválidas. Verifique e-mail e senha." };
  }

  // Acesso restrito: somente e-mails cadastrados na tabela administradores.
  const { data: admin } = await supabase
    .from("administradores")
    .select("email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Acesso restrito. Este painel é apenas para a equipe Master Web Designer." };
  }

  redirect("/admin");
}

export async function sair() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// =====================================================
// CLIENTES & SITES (projetos)
// =====================================================

export async function criarCliente(formData: FormData) {
  const supabase = createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert({
      nome,
      email: String(formData.get("email") ?? "").trim() || null,
      telefone_whatsapp: String(formData.get("telefone_whatsapp") ?? "").trim() || null,
      cpf_cnpj: String(formData.get("cpf_cnpj") ?? "").trim() || null,
    })
    .select("id")
    .maybeSingle();

  if (error || !cliente) {
    if (error) console.error("[criarCliente]", error.message);
    return;
  }

  const valor = parseValorBRL(String(formData.get("valor_mensalidade") ?? ""));

  const { data: projeto, error: eProjeto } = await supabase
    .from("projetos")
    .insert({
      cliente_id: cliente.id,
      nome_site: String(formData.get("nome_site") ?? "").trim() || nome,
      dominio: String(formData.get("dominio") ?? "").trim() || null,
      repo_github: String(formData.get("repo_github") ?? "").trim() || null,
      servidor: String(formData.get("servidor") ?? "").trim() || null,
      valor_mensalidade: Number.isFinite(valor) && valor > 0 ? valor : 0,
      dia_vencimento: clampDia(formData.get("dia_vencimento")),
      status: (String(formData.get("status") ?? "ativo") === "suspenso" ? "suspenso" : "ativo") as ProjetoStatus,
    })
    .select("id")
    .maybeSingle();

  if (eProjeto) console.error("[criarCliente:projeto]", eProjeto.message);
  else if (projeto) await sincronizarFaturaDoMes(projeto.id);

  revalidar();
}

export async function atualizarCliente(formData: FormData) {
  const supabase = createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const { error } = await supabase
    .from("clientes")
    .update({
      nome,
      email: String(formData.get("email") ?? "").trim() || null,
      telefone_whatsapp: String(formData.get("telefone_whatsapp") ?? "").trim() || null,
      cpf_cnpj: String(formData.get("cpf_cnpj") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) console.error("[atualizarCliente]", error.message);

  const projetoId = String(formData.get("projeto_id") ?? "");
  const valor = parseValorBRL(String(formData.get("valor_mensalidade") ?? ""));
  const status = (String(formData.get("status") ?? "ativo") === "suspenso" ? "suspenso" : "ativo") as ProjetoStatus;

  if (projetoId) {
    const { error: eProjeto } = await supabase
      .from("projetos")
      .update({
        nome_site: String(formData.get("nome_site") ?? "").trim() || nome,
        dominio: String(formData.get("dominio") ?? "").trim() || null,
        repo_github: String(formData.get("repo_github") ?? "").trim() || null,
        servidor: String(formData.get("servidor") ?? "").trim() || null,
        valor_mensalidade: Number.isFinite(valor) && valor > 0 ? valor : 0,
        dia_vencimento: clampDia(formData.get("dia_vencimento")),
        status,
      })
      .eq("id", projetoId);
    if (eProjeto) console.error("[atualizarCliente:projeto]", eProjeto.message);
    else await sincronizarFaturaDoMes(projetoId);
  } else {
    const { error: eProjeto } = await supabase.from("projetos").insert({
      cliente_id: id,
      nome_site: String(formData.get("nome_site") ?? "").trim() || nome,
      dominio: String(formData.get("dominio") ?? "").trim() || null,
      repo_github: String(formData.get("repo_github") ?? "").trim() || null,
      servidor: String(formData.get("servidor") ?? "").trim() || null,
      valor_mensalidade: Number.isFinite(valor) && valor > 0 ? valor : 0,
      dia_vencimento: clampDia(formData.get("dia_vencimento")),
      status,
    });
    if (eProjeto) console.error("[atualizarCliente:novoprojeto]", eProjeto.message);
  }

  revalidar();
}

export async function atualizarProjeto(formData: FormData) {
  const supabase = createClient();

  const projetoId = String(formData.get("id") ?? "");
  if (!projetoId) return;

  const nome_site = String(formData.get("nome_site") ?? "").trim();
  const valor = parseValorBRL(String(formData.get("valor_mensalidade") ?? ""));
  const status = (String(formData.get("status") ?? "ativo") === "suspenso" ? "suspenso" : "ativo") as ProjetoStatus;

  const { error } = await supabase
    .from("projetos")
    .update({
      nome_site: nome_site || undefined,
      dominio: String(formData.get("dominio") ?? "").trim() || null,
      repo_github: String(formData.get("repo_github") ?? "").trim() || null,
      servidor: String(formData.get("servidor") ?? "").trim() || null,
      valor_mensalidade: Number.isFinite(valor) && valor > 0 ? valor : 0,
      dia_vencimento: clampDia(formData.get("dia_vencimento")),
      status,
    })
    .eq("id", projetoId);

  if (error) console.error("[atualizarProjeto]", error.message);
  else await sincronizarFaturaDoMes(projetoId);

  revalidar();
}

export async function atualizarStatusProjeto(projetoId: string, status: ProjetoStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("projetos").update({ status }).eq("id", projetoId);

  if (error) console.error("[atualizarStatusProjeto]", error.message);

  revalidar();
}

export async function excluirCliente(clienteId: string) {
  const supabase = createClient();

  const { error } = await supabase.from("clientes").delete().eq("id", clienteId);

  if (error) console.error("[excluirCliente]", error.message);

  revalidar();
}

// =====================================================
// FINANCEIRO
// =====================================================

export async function definirMensalidade(formData: FormData) {
  const supabase = createClient();

  const projetoId = String(formData.get("projeto_id") ?? "");
  if (!projetoId) return;

  const valor = parseValorBRL(String(formData.get("valor_mensalidade") ?? ""));
  if (!Number.isFinite(valor) || valor <= 0) return;

  const dia_vencimento = clampDia(formData.get("dia_vencimento"));

  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, cliente_id, valor_mensalidade, dia_vencimento")
    .eq("id", projetoId)
    .maybeSingle();

  if (!projeto) return;

  const { error } = await supabase
    .from("projetos")
    .update({ valor_mensalidade: valor, dia_vencimento })
    .eq("id", projetoId);

  if (error) {
    console.error("[definirMensalidade]", error.message);
    return;
  }

  // Atualiza (ou cria) a fatura do mês vigente com o novo valor.
  const periodo = periodoAtualISO();
  const novoVencimento = vencimentoISO(periodo, dia_vencimento);

  const { data: existente } = await supabase
    .from("faturas")
    .select("id, status_pagamento")
    .eq("projeto_id", projetoId)
    .eq("periodo", periodo)
    .maybeSingle<{ id: string; status_pagamento: string | null }>();

  if (existente) {
    // Fatura do mês já fechada (paga) não é reescrita.
    if (existente.status_pagamento === "pago") {
      revalidar();
      return;
    }
    const { error: eAtualiza } = await supabase
      .from("faturas")
      .update({ valor, data_vencimento: novoVencimento })
      .eq("id", existente.id);
    if (eAtualiza) console.error("[definirMensalidade:fatura]", eAtualiza.message);
  } else {
    const { error: eInsere } = await supabase.from("faturas").insert({
      projeto_id: projetoId,
      cliente_id: projeto.cliente_id,
      periodo,
      valor,
      data_vencimento: novoVencimento,
      status_pagamento: "pendente",
    });
    if (eInsere) console.error("[definirMensalidade:fatura]", eInsere.message);
  }

  revalidar();
}

export async function marcarFatura(faturaId: string, status: PagamentoStatus) {
  const supabase = createClient();

  const { error } = await supabase
    .from("faturas")
    .update({
      status_pagamento: status,
      pago_em: status === "pago" ? new Date().toISOString() : null,
    })
    .eq("id", faturaId);

  if (error) console.error("[marcarFatura]", error.message);

  revalidar();
}

export async function atualizarFatura(formData: FormData) {
  const supabase = createClient();

  const faturaId = String(formData.get("id") ?? "");
  if (!faturaId) return;

  const valor = parseValorBRL(String(formData.get("valor") ?? ""));
  if (!Number.isFinite(valor) || valor <= 0) return;

  const dataVencimento = String(formData.get("data_vencimento") ?? "");

  const updates: Record<string, string | number> = { valor };
  if (dataVencimento) updates.data_vencimento = dataVencimento;

  const { error } = await supabase.from("faturas").update(updates).eq("id", faturaId);

  if (error) console.error("[atualizarFatura]", error.message);

  revalidar();
}

export async function gerarCobrancaFaturaPix(faturaId: string) {
  const supabase = createClient();

  const { data: fatura } = await supabase
    .from("faturas")
    .select("*, clientes!faturas_cliente_fk(id, email, nome), projetos(id, nome_site)")
    .eq("id", faturaId)
    .maybeSingle<{
      id: string;
      valor: number;
      data_vencimento: string;
      gateway_id: string | null;
      clientes: { id: string; email: string | null; nome: string } | null;
      projetos: { id: string; nome_site: string } | null;
    }>();

  if (!fatura || !fatura.clientes) return;

  const { criarCobranca, obterOuCriarClienteAsaas } = await import("@/lib/asaas");
  const customer = await obterOuCriarClienteAsaas(fatura.clientes.email, fatura.clientes.nome);
  if (!customer) return;

  const cobranca = await criarCobranca({
    customer,
    billingType: "PIX",
    value: Number(fatura.valor),
    dueDate: fatura.data_vencimento.slice(0, 10),
    description: `Mensalidade site ${fatura.projetos?.nome_site ?? ""}`,
  });

  if (!cobranca) return;

  await supabase
    .from("faturas")
    .update({ gateway_id: cobranca.id, link_pix_boleto: cobranca.invoiceUrl })
    .eq("id", faturaId);

  revalidar();
}