import { createClient } from "@/lib/supabase/server";
import type { PagamentoStatus } from "@/lib/types";

/**
 * =====================================================
 * INTEGRAÇÃO ASAAS - PIX AUTOMÁTICO
 * =====================================================
 * Para ativar:
 *  1. Defina ASSAAS_API_KEY e ASSAAS_WEBHOOK_SECRET no .env.local
 *  2. Configure o Webhook no Asaas apontando para:
 *     https://SEU-DOMINIO/api/webhooks/asaas
 *
 * O campo `gateway_id` na tabela faturas guarda o id da cobrança no
 * Asaas e `link_pix_boleto` guarda o link do PIX/boleto gerado.
 */

const ASAAS_API = "https://api.asaas.com/v3";

export interface AsaasCobrancaInput {
  customer: string;
  billingType: "PIX" | "BOLETO";
  value: number;
  dueDate: string; // "AAAA-MM-DD"
  description?: string;
}

export interface AsaasCobrancaResult {
  id: string;
  invoiceUrl: string | null;
}

type AsaasEvento = {
  event?: string;
  type?: string;
  payment?: {
    id?: string;
  };
};

const STATUS_POR_EVENTO: Record<string, PagamentoStatus> = {
  PAYMENT_RECEIVED: "pago",
  PAYMENT_CONFIRMED: "pago",
  PAYMENT_PENDING: "pendente",
  PAYMENT_OVERDUE: "atrasado",
};

/**
 * Busca (por e-mail) ou cria o cliente no Asaas, retornando o `id` do
 * customer. Retorna null enquanto a chave não for configurada.
 */
export async function obterOuCriarClienteAsaas(
  email: string | null,
  nome: string
): Promise<string | null> {
  const apiKey = process.env.ASSAAS_API_KEY;
  if (!apiKey) return null;

  try {
    const query = email
      ? `?email=${encodeURIComponent(email)}&limit=1`
      : "?limit=1";
    const busca = await fetch(`${ASAAS_API}/customers${query}`, {
      headers: { access_token: apiKey },
    });

    if (busca.ok) {
      const lista = await busca.json();
      if (lista?.data?.length) return String(lista.data[0].id);
    }

    const res = await fetch(`${ASAAS_API}/customers`, {
      method: "POST",
      headers: {
        access_token: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nome,
        ...(email ? { email } : {}),
        notificationDisabled: true,
      }),
    });

    if (!res.ok) {
      console.error("[asaas:criarCliente]", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return String(data.id ?? "");
  } catch (err) {
    console.error("[asaas:obterOuCriarCliente]", err);
    return null;
  }
}

/**
 * Cria uma cobrança PIX (ou boleto) no Asaas. Retorna null enquanto a chave
 * não for configurada (neste caso a fatura permanece manual).
 */
export async function criarCobranca(input: AsaasCobrancaInput): Promise<AsaasCobrancaResult | null> {
  const apiKey = process.env.ASSAAS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${ASAAS_API}/payments`, {
      method: "POST",
      headers: {
        access_token: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      console.error("[asaas:criarCobranca]", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return { id: String(data.id ?? ""), invoiceUrl: data.invoiceUrl ?? null };
  } catch (err) {
    console.error("[asaas:criarCobranca]", err);
    return null;
  }
}

/**
 * Processa webhooks do Asaas e sincroniza o status das faturas.
 * - PAYMENT_RECEIVED   -> pago
 * - PAYMENT_PENDING    -> pendente
 * - PAYMENT_OVERDUE    -> atrasado
 */
export async function processarEventoAsaas(payload: AsaasEvento): Promise<void> {
  const supabase = createClient();

  const paymentId = String(payload?.payment?.id ?? "");
  const eventKey = String(payload?.event ?? payload?.type ?? "");
  const status = STATUS_POR_EVENTO[eventKey];

  if (!paymentId || !status) return;

  await supabase
    .from("faturas")
    .update({
      status_pagamento: status,
      pago_em: status === "pago" ? new Date().toISOString() : null,
    })
    .eq("gateway_id", paymentId);

  console.info("[asaas:webhook]", eventKey, "->", status, paymentId);
}