import { createClient } from "@/lib/supabase/server";
import type { FaturaComRelacoes } from "@/lib/types";
import { periodoAtualISO, vencimentoISO } from "@/lib/utils";

/**
 * Select canônico das faturas com cliente e projeto.
 *
 * Usa o hint `clientes!faturas_cliente_fk` para desambiguar o relacionamento
 * quando existem duas chaves estrangeiras faturas->clientes (a antiga
 * `faturas_cliente_id_fkey` do schema original + a `faturas_cliente_fk`
 * criada na migração). Sem o hint o PostgREST responde HTTP 300 (múltiplas
 * escolhas) e a consulta retorna vazio — sintoma de "faturas do mês vazias".
 */
export const FATURAS_DO_MES_SELECT =
  "*, clientes!faturas_cliente_fk(id, nome, telefone_whatsapp), projetos(id, nome_site, dominio, valor_mensalidade, dia_vencimento, status)";

/**
 * Retorna todas as faturas do mês/ano informado (padrão: mês atual),
 * ordenadas por vencimento. É A consulta única usada pelos cards e pela
 * tabela "Cobranças do mês", garantindo leitura idêntica.
 */
export async function buscarFaturasDoMes(periodo?: string): Promise<FaturaComRelacoes[]> {
  const supabase = createClient();
  const p = periodo ?? periodoAtualISO();

  const { data } = await supabase
    .from("faturas")
    .select(FATURAS_DO_MES_SELECT)
    .eq("periodo", p)
    .order("data_vencimento")
    .returns<FaturaComRelacoes[]>();

  return data ?? [];
}

/**
 * Gera as faturas pendentes do mês atual (idempotente).
 *
 * - Sem `projetoId`: para todos os projetos ATIVOS com mensalidade, verifica
 *   se já existe fatura do mês/ano corrente; se não existir, insere com
 *   projeto_id, cliente_id, valor = valor_mensalidade, data_vencimento =
 *   dia de vencimento do projeto e status_pagamento = 'pendente'.
 * - Com `projetoId`: faz o mesmo para um site específico.
 */
export async function gerarFaturasDoMes(projetoId?: string): Promise<void> {
  const supabase = createClient();
  const periodo = periodoAtualISO();

  const aplicarEm = async (id: string, clienteId: string, valor: number, vencimentoDia: number) => {
    if (valor <= 0) return;
    const { data: existente } = await supabase
      .from("faturas")
      .select("id")
      .eq("projeto_id", id)
      .eq("periodo", periodo)
      .maybeSingle();

    if (existente) return;

    const { error } = await supabase.from("faturas").insert({
      projeto_id: id,
      cliente_id: clienteId,
      periodo,
      valor,
      data_vencimento: vencimentoISO(periodo, vencimentoDia),
      status_pagamento: "pendente",
    });

    if (error) console.error("[gerarFaturasDoMes]", error.message);
  };

  if (projetoId) {
    const { data } = await supabase
      .from("projetos")
      .select("id, cliente_id, valor_mensalidade, dia_vencimento")
      .eq("id", projetoId)
      .eq("status", "ativo")
      .maybeSingle();

    if (data) await aplicarEm(data.id, data.cliente_id, Number(data.valor_mensalidade), data.dia_vencimento);
    return;
  }

  const { data: projetos } = await supabase
    .from("projetos")
    .select("id, cliente_id, valor_mensalidade, dia_vencimento")
    .eq("status", "ativo");

  for (const projeto of projetos ?? []) {
    await aplicarEm(projeto.id, projeto.cliente_id, Number(projeto.valor_mensalidade), projeto.dia_vencimento);
  }
}

/** Alias de compatibilidade. */
export const garantirFaturasDoMes = gerarFaturasDoMes;

/**
 * Cria ou atualiza a fatura do mês do site usando os valores atuais do
 * projeto. Usado logo após editar mensalidade / dia de vencimento, para que
 * a cobrança aberta acompanhe a nova configuração sem gerar duplicata.
 * Se a fatura do mês já estiver PAGA, ela não é reescrita.
 */
export async function sincronizarFaturaDoMes(projetoId: string): Promise<void> {
  const supabase = createClient();

  const { data: projeto } = await supabase
    .from("projetos")
    .select("id, cliente_id, valor_mensalidade, dia_vencimento, status")
    .eq("id", projetoId)
    .maybeSingle();

  if (!projeto || projeto.status !== "ativo") return;

  const valor = Number(projeto.valor_mensalidade);
  if (valor <= 0) return;

  const periodo = periodoAtualISO();
  const dataVencimento = vencimentoISO(periodo, projeto.dia_vencimento);

  const { data: existente } = await supabase
    .from("faturas")
    .select("id, status_pagamento")
    .eq("projeto_id", projetoId)
    .eq("periodo", periodo)
    .maybeSingle<{ id: string; status_pagamento: string | null }>();

  if (existente) {
    if (existente.status_pagamento === "pago") return;
    await supabase
      .from("faturas")
      .update({ valor, data_vencimento: dataVencimento })
      .eq("id", existente.id);
    return;
  }

  await supabase.from("faturas").insert({
    projeto_id: projetoId,
    cliente_id: projeto.cliente_id,
    periodo,
    valor,
    data_vencimento: dataVencimento,
    status_pagamento: "pendente",
  });
}