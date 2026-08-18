-- ============================================================
-- MASTER WEB DESIGNER - DASHBOARD ADMIN (Supabase / PostgreSQL)
-- MODELO DE 3 TABELAS: clientes -> projetos -> faturas
--
-- Este script é IDEMPOTENTE e também converte o modelo antigo
-- (monolótico: clientes guardava domínio/mensalidade/status) para
-- o novo modelo, preservando os dados existentes:
--
--   clientes.mensalidade       -> projetos.valor_mensalidade
--   clientes.vencimento_dia    -> projetos.dia_vencimento
--   clientes.dominio           -> projetos.dominio
--   clientes.repo_github       -> projetos.repo_github
--   clientes.servidor          -> projetos.servidor
--   clientes.status            -> projetos.status (Cancelado=suspenso;
--                                demais = ativo)
--   clientes.whatsapp          -> clientes.telefone_whatsapp
--   faturas.vencimento         -> faturas.data_vencimento
--   faturas.status             -> faturas.status_pagamento
--   faturas.asaas_id           -> faturas.gateway_id
--   faturas.cliente_id (novo)  -> projetos.id copiado para faturas.projeto_id
-- ============================================================

-- ============================================================
-- 1) TIPOS (ENUM) - as novas tabelas usam TEXT + CHECK, então os
--    enums antigos são removidos ao final da migração.
-- ============================================================

-- ============================================================
-- 2) ADMINISTRADORES (somente você / equipe)
-- ============================================================
create table if not exists public.administradores (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3) CLIENTES (dados do contratante)
-- ============================================================
create table if not exists public.clientes (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  data_cadastro      timestamptz not null default now(),
  nome               text not null,
  email              text,
  telefone_whatsapp  text,
  cpf_cnpj           text
);

-- Migração de colunas do modelo antigo
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'whatsapp'
  ) then
    alter table public.clientes rename column whatsapp to telefone_whatsapp;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'cpf_cnpj'
  ) then
    alter table public.clientes add column cpf_cnpj text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'data_cadastro'
  ) then
    alter table public.clientes add column data_cadastro timestamptz;
  end if;
end $$;

update public.clientes set data_cadastro = coalesce(created_at, now()) where data_cadastro is null;
alter table public.clientes alter column data_cadastro set not null;
alter table public.clientes alter column data_cadastro set default now();

-- ============================================================
-- 4) PROJETOS (sites) - um cliente pode ter vários
-- ============================================================
create table if not exists public.projetos (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  cliente_id         uuid not null references public.clientes(id) on delete cascade,
  nome_site          text not null,
  dominio            text,
  repo_github        text,
  servidor           text,
  valor_mensalidade  numeric(10,2) not null default 0,
  dia_vencimento     smallint not null default 10 check (dia_vencimento between 1 and 31),
  status             text not null default 'ativo' check (status in ('ativo', 'suspenso'))
);

-- Cria um projeto para cada cliente que ainda não tenha um
-- (migração do modelo antigo, que era 1 cliente = 1 site).
insert into public.projetos (cliente_id, nome_site, dominio, repo_github, servidor, valor_mensalidade, dia_vencimento, status)
select
  c.id,
  c.nome,
  c.dominio,
  c.repo_github,
  c.servidor,
  c.mensalidade,
  c.vencimento_dia,
  case when c.status = 'Cancelado' then 'suspenso' else 'ativo' end
from public.clientes c
where not exists (select 1 from public.projetos p where p.cliente_id = c.id);

-- Remove do cliente as colunas que agora vivem no projeto
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'mensalidade') then
    alter table public.clientes drop column mensalidade;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'vencimento_dia') then
    alter table public.clientes drop column vencimento_dia;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'dominio') then
    alter table public.clientes drop column dominio;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'repo_github') then
    alter table public.clientes drop column repo_github;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'servidor') then
    alter table public.clientes drop column servidor;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clientes' and column_name = 'status') then
    alter table public.clientes drop column status;
  end if;
end $$;

-- ============================================================
-- 5) FATURAS (cobranças recorrentes dos sites)
-- ============================================================
create table if not exists public.faturas (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  projeto_id        uuid,
  cliente_id        uuid,
  periodo           date not null default (date_trunc('month', now())::date),
  valor             numeric(10,2) not null,
  data_vencimento   date,
  status_pagamento  text check (status_pagamento in ('pendente', 'pago', 'atrasado')),
  link_pix_boleto   text,
  gateway_id        text,
  pago_em           timestamptz
);

-- Migração das colunas do modelo antigo
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'faturas' and column_name = 'projeto_id'
  ) then
    alter table public.faturas add column projeto_id uuid;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'faturas' and column_name = 'status_pagamento'
  ) then
    alter table public.faturas add column status_pagamento text check (status_pagamento in ('pendente', 'pago', 'atrasado'));
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'faturas' and column_name = 'data_vencimento'
  ) then
    alter table public.faturas add column data_vencimento date;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'faturas' and column_name = 'link_pix_boleto'
  ) then
    alter table public.faturas add column link_pix_boleto text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'faturas' and column_name = 'gateway_id'
  ) then
    alter table public.faturas add column gateway_id text;
  end if;
end $$;

-- Preenche projeto_id a partir do projeto do cliente da fatura
update public.faturas f
set projeto_id = p.id
from public.projetos p
where p.cliente_id = f.cliente_id
  and f.projeto_id is null;

-- Converte dados antigos
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'faturas' and column_name = 'vencimento') then
    update public.faturas set data_vencimento = vencimento where data_vencimento is null;
    alter table public.faturas drop column vencimento;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'faturas' and column_name = 'status') then
    update public.faturas
    set status_pagamento = case status
      when 'Pago' then 'pago'
      when 'Em Atraso' then 'atrasado'
      else 'pendente'
    end
    where status_pagamento is null;
    alter table public.faturas drop column status;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'faturas' and column_name = 'asaas_id') then
    update public.faturas set gateway_id = asaas_id where gateway_id is null;
    alter table public.faturas drop column asaas_id;
  end if;
end $$;

update public.faturas set status_pagamento = 'pendente' where status_pagamento is null;
alter table public.faturas alter column projeto_id set not null;
alter table public.faturas alter column cliente_id set not null;
alter table public.faturas alter column data_vencimento set not null;
alter table public.faturas alter column status_pagamento set not null;
alter table public.faturas alter column status_pagamento set default 'pendente';

alter table public.faturas add constraint faturas_projeto_fk
  foreign key (projeto_id) references public.projetos(id) on delete cascade;
alter table public.faturas add constraint faturas_cliente_fk
  foreign key (cliente_id) references public.clientes(id) on delete cascade;

-- Remove a FK antiga (faturas->clientes) do schema original: manter as duas
-- deixaria o relacionamento ambíguo no PostgREST (HTTP 300) e os embeds
-- `clientes(...)` passariam a retornar vazio.
alter table public.faturas drop constraint if exists faturas_cliente_id_fkey;

-- Remove a unicidade antiga (cliente_id + periodo) para permitir que um
-- cliente com vários sites gere uma fatura por site.
do $$
declare v_con text;
begin
  select conname into v_con
  from pg_constraint
  where conrelid = 'public.faturas'::regclass
    and contype = 'u'
    and conkey = (
      select array_agg(attnum order by attnum)
      from pg_attribute
      where attrelid = 'public.faturas'::regclass
        and attname in ('cliente_id', 'periodo')
    );
  if v_con is not null then
    execute 'alter table public.faturas drop constraint ' || quote_ident(v_con);
  end if;
end $$;

-- Fallback para o nome gerado automaticamente pelo CREATE TABLE antigo
alter table public.faturas drop constraint if exists faturas_cliente_id_periodo_key;

alter table public.faturas drop constraint if exists faturas_projeto_periodo_unique;
alter table public.faturas add constraint faturas_projeto_periodo_unique unique (projeto_id, periodo);

-- Enums antigos não são mais usados
drop type if exists public.fatura_status;
drop type if exists public.projeto_status;

-- ============================================================
-- 6) GRANTS
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

-- ============================================================
-- 7) ÍNDICES
-- ============================================================
create index if not exists idx_clientes_nome on public.clientes (nome);
create index if not exists idx_clientes_email on public.clientes (email);
create index if not exists idx_projetos_cliente on public.projetos (cliente_id);
create index if not exists idx_projetos_status on public.projetos (status);
create index if not exists idx_faturas_projeto_periodo on public.faturas (projeto_id, periodo);
create index if not exists idx_faturas_status_pagamento on public.faturas (status_pagamento);
create index if not exists idx_faturas_gateway on public.faturas (gateway_id) where gateway_id is not null;

-- ============================================================
-- 8) TRIGGER: atualização automática de updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated
  before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projetos_updated on public.projetos;
create trigger trg_projetos_updated
  before update on public.projetos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_faturas_updated on public.faturas;
create trigger trg_faturas_updated
  before update on public.faturas
  for each row execute function public.set_updated_at();

-- ============================================================
-- 9) ROW LEVEL SECURITY (apenas administradores acessam)
-- ============================================================
alter table public.administradores enable row level security;
alter table public.clientes enable row level security;
alter table public.projetos enable row level security;
alter table public.faturas enable row level security;

drop policy if exists "admin le a propria linha" on public.administradores;
create policy "admin le a propria linha" on public.administradores
  for select
  using (auth.uid() = id);

drop policy if exists "clientes somente admin" on public.clientes;
create policy "clientes somente admin" on public.clientes
  for all
  using (auth.uid() in (select id from public.administradores))
  with check (auth.uid() in (select id from public.administradores));

drop policy if exists "projetos somente admin" on public.projetos;
create policy "projetos somente admin" on public.projetos
  for all
  using (auth.uid() in (select id from public.administradores))
  with check (auth.uid() in (select id from public.administradores));

drop policy if exists "faturas somente admin" on public.faturas;
create policy "faturas somente admin" on public.faturas
  for all
  using (auth.uid() in (select id from public.administradores))
  with check (auth.uid() in (select id from public.administradores));

-- ============================================================
-- 10) FUNÇÃO: gerar faturas do mês (manual ou via pg_cron)
--     Gera para projetos ATIVOS com mensalidade > 0.
-- ============================================================
create or replace function public.gerar_faturas_mes(p_data date default current_date)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_periodo     date := date_trunc('month', p_data)::date;
  v_ultimo_dia  int  := extract(day from (v_periodo + interval '1 month - 1 day'))::int;
  v_contador    int  := 0;
  r             record;
begin
  for r in
    select id, cliente_id, valor_mensalidade, dia_vencimento
    from public.projetos
    where status = 'ativo'
      and valor_mensalidade > 0
  loop
    if not exists (
      select 1 from public.faturas f
      where f.projeto_id = r.id and f.periodo = v_periodo
    ) then
      insert into public.faturas (projeto_id, cliente_id, periodo, valor, data_vencimento, status_pagamento)
      values (
        r.id,
        r.cliente_id,
        v_periodo,
        r.valor_mensalidade,
        v_periodo + least(r.dia_vencimento - 1, v_ultimo_dia - 1),
        'pendente'
      );
      v_contador := v_contador + 1;
    end if;
  end loop;
  return v_contador;
end;
$$;

-- Uso manual: select public.gerar_faturas_mes();

-- (OPCIONAL) Agendamento recorrente via extensão pg_cron do Supabase:
--   select cron.schedule(
--     'gerar-faturas-mensais',
--     '0 1 1 * *',            -- todo dia 1 às 01:00
--     'select public.gerar_faturas_mes(current_date)'
--   );

-- ============================================================
-- 11) CADASTRO DO SEU ADMIN (seguro de rodar várias vezes)
--     1. Crie o usuário em Authentication > Users > Add user (e-mail + senha).
--     2. Descomente a linha abaixo trocando seu e-mail:
-- ============================================================
-- insert into public.administradores (id, email)
-- select id, email from auth.users where email = 'SEU_EMAIL@EXEMPLO.COM'
-- on conflict (id) do nothing;