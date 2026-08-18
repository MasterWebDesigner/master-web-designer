import { NextResponse } from "next/server";
import { processarEventoAsaas } from "@/lib/asaas";

/**
 * Webhook do Asaas para baixa automática de cobranças PIX.
 *
 * Onde configurar: Asaas (integração) > Webhook
 * URL: https://SEU-DOMINIO/api/webhooks/asaas
 * Eventos: PAYMENT_RECEIVED, PAYMENT_PENDING, PAYMENT_OVERDUE (ou "Tudo")
 *
 * Autenticação: token livre pode ser enviado via header
 * "x-asaas-token" OU "Authorization: Bearer <token>". Sem o token
 * configurado no .env, o endpoint aceita o payload (uso em dev).
 */
export async function POST(req: Request) {
  const secret = process.env.ASSAAS_WEBHOOK_SECRET;

  if (secret) {
    const token =
      req.headers.get("x-asaas-token") ??
      req.headers.get("authorization")?.replace("Bearer ", "");
    if (token !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const payload = await req.json();
  await processarEventoAsaas(payload);

  return NextResponse.json({ ok: true });
}