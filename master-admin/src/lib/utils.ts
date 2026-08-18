import type { PagamentoStatus, ProjetoStatus } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDateBR(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function periodoAtualISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function vencimentoISO(periodo: string, dia: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const d = Math.max(1, Math.min(dia || 10, ultimoDia));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function mesAnoLabel(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} de ${y}`;
}

export const STATUS_PROJETO: Record<ProjetoStatus, string> = {
  ativo: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  suspenso: "bg-amber-400/10 text-amber-300 border-amber-400/30",
};

export const STATUS_PAGAMENTO: Record<PagamentoStatus, string> = {
  pago: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  pendente: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  atrasado: "bg-red-400/10 text-red-300 border-red-400/30",
};

export const PROJETO_STATUS_OPTIONS: ProjetoStatus[] = ["ativo", "suspenso"];

export function labelProjetoStatus(status: ProjetoStatus): string {
  return status === "ativo" ? "Ativo" : "Suspenso";
}

export function labelPagamento(status: PagamentoStatus): string {
  if (status === "pago") return "Pago";
  if (status === "pendente") return "Pendente";
  return "Atrasado";
}