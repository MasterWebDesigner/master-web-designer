export type ProjetoStatus = "ativo" | "suspenso";

export type PagamentoStatus = "pendente" | "pago" | "atrasado";

export interface Cliente {
  id: string;
  created_at: string;
  updated_at: string;
  data_cadastro: string;
  nome: string;
  email: string | null;
  telefone_whatsapp: string | null;
  cpf_cnpj: string | null;
}

export type ClienteComProjetos = Cliente & { projetos: Projeto[] | null };

export interface Projeto {
  id: string;
  created_at: string;
  updated_at: string;
  cliente_id: string;
  nome_site: string;
  dominio: string | null;
  repo_github: string | null;
  servidor: string | null;
  valor_mensalidade: number;
  dia_vencimento: number;
  status: ProjetoStatus;
}

export type ProjetoResumo = Pick<
  Projeto,
  "id" | "cliente_id" | "nome_site" | "dominio" | "valor_mensalidade" | "dia_vencimento" | "status"
>;

export type ProjetoComCliente = ProjetoResumo & { cliente_nome: string };

export interface Fatura {
  id: string;
  created_at: string;
  updated_at: string;
  projeto_id: string;
  cliente_id: string;
  periodo: string;
  valor: number;
  data_vencimento: string;
  status_pagamento: PagamentoStatus;
  link_pix_boleto: string | null;
  gateway_id: string | null;
  pago_em: string | null;
}

export type ClienteResumo = Pick<Cliente, "id" | "nome" | "telefone_whatsapp">;

export interface FaturaComRelacoes extends Omit<Fatura, "clientes" | "projetos"> {
  clientes: ClienteResumo | null;
  projetos: ProjetoResumo | null;
}

export interface LoginState {
  error: string | null;
}