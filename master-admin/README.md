# Master Web Designer — Dashboard Admin

Painel interno de gestão da agência **Master Web Designer** (por Daniel Navarro):
cadastro de **clientes, sites (projetos)** e controle de **mensalidades recorrentes**
com integração PIX (Asaas).

Modelo de dados em **3 tabelas**: `clientes` → `projetos` → `faturas`.
Um cliente pode ter vários sites, e cada site pode ter sua própria recorrência.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase** (Auth + PostgreSQL + RLS).

## Rotas

| Rota                 | Descrição                                                |
| -------------------- | -------------------------------------------------------- |
| `/login`             | Acesso restrito (somente admin)                          |
| `/admin`             | Dashboard com estatísticas                               |
| `/admin/clientes`    | Cadastro de clientes & sites (com mensalidade e vencimento) |
| `/admin/financeiro`  | Dashboard de faturamento (faturas, PIX, planos vigentes) |
| `/api/webhooks/asaas`| Webhook para baixa automática de PIX (Asaas)             |

---

## Como rodar localmente

### 1. Criar o projeto no Supabase

1. Acesse <https://supabase.com> → **New project** (nome: `master-admin`).
2. Vá em **SQL Editor** → cole e execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   O script cria as tabelas `clientes`/`projetos`/`faturas`, enums, índices, triggers,
   funções e RLS — e, se você já usava a versão antiga (monolítica), **migra os dados
   existentes** automaticamente (mensalidade/domínio/status vão para `projetos`, faturas
   ganham `projeto_id`, `gateway_id` e `link_pix_boleto`).
3. Em **Authentication → Providers → Email**, deixe o e-mail habilitado
   (para login com senha).

### 2. Criar o seu usuário admin

1. Em **Authentication → Users → Add user**, crie seu e-mail + senha (ex: `voce@masterwebdesigner.com.br`).
2. Rode no SQL Editor:

```sql
insert into public.administradores (id, email)
select id, email from auth.users where email = 'SEU_EMAIL@EXEMPLO.COM';
```

> Só e-mails presentes em `administradores` conseguem entrar — outros usuários são bloqueados no login.

### 3. Configurar as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Preencha com os dados de **Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` → URL do projeto (ex: `https://xxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public key

### 4. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse <http://localhost:3000/login> e entre com o admin criado no passo 2.

---

## Fluxo de uso

1. **Clientes & Sites**: cadastre o cliente (nome, e-mail, WhatsApp, CPF/CNPJ) e o site
   (nome, domínio, GitHub, servidor) no mesmo formulário. Preencha **mensalidade** e
   **dia do vencimento** e a fatura do mês atual é gerada automaticamente (se o site
   estiver **ativo**).
2. **Faturamento**: a tabela mostra cada site e as cobranças com status
   `Pago` (verde), `Pendente` (amarelo) e `Atrasado` (vermelho). Marque a baixa
   manualmente pelos botões de ação ou use o botão **PIX** para gerar a cobrança no Asaas.
3. **Planos vigentes**: lista os sites ativos com recorrência (valor + dia de vencimento).
4. O dashboard calcula receita do mês, a receber e inadimplentes.

> As faturas são geradas automaticamente ao abrir as páginas do painel (a cada mês, para
> sites **ativos** com mensalidade). Para geração via banco, use
> `select public.gerar_faturas_mes();` ou agende com pg_cron (exemplo no schema).

---

## Integração PIX automática (Asaas)

A estrutura está **pronta** — falta só ativar a API:

1. Crie uma conta no [Asaas](https://asaas.com) e gere a API Key de produção/integração.
2. No `.env.local`:
   - `ASSAAS_API_KEY` → sua chave de integração
   - `ASSAAS_WEBHOOK_SECRET` → um token livre que você mesmo define
3. No painel do Asaas, configure o **Webhook** apontando para o seu domínio:
   `https://SEU-DOMINIO/api/webhooks/asaas` (eventos de pagamento).
4. Em cada fatura, o botão **PIX** cria (ou reusa) o customer no Asaas e gera a cobrança
   PIX (endpoint `POST /v3/payments`), salvando `gateway_id` e `link_pix_boleto` na fatura.
5. O webhook já converte `PAYMENT_RECEIVED → pago`, `PAYMENT_PENDING → pendente`,
   `PAYMENT_OVERDUE → atrasado` e grava a baixa pelo `gateway_id`.

> Para Mercado Pago o padrão é o mesmo (Preferences + Webhooks); crie um arquivo
> `src/app/api/webhooks/mercado-pago/route.ts` espelhando o endpoint do Asaas.

---

## Estrutura de pastas

```
master-admin/
├─ middleware.ts                # proteção de rotas (sessão)
├─ supabase/schema.sql          # banco de dados completo
├─ src/
│  ├─ app/
│  │  ├─ actions.ts             # server actions (auth, clientes, financeiro)
│  │  ├─ login/page.tsx
│  │  ├─ admin/
│  │  │  ├─ layout.tsx          # guarda administrativa + sidebar
│  │  │  ├─ page.tsx            # dashboard
│  │  │  ├─ clientes/page.tsx
│  │  │  └─ financeiro/page.tsx
│  │  └─ api/webhooks/asaas/route.ts
│  ├─ components/
│  │  ├─ admin/                 # sidebar, formulários, tabelas, UI kit
│  │  ├─ icons.tsx              # ícones SVG (sem dependências)
│  │  └─ login-form.tsx
│  └─ lib/
│     ├─ supabase/{client,server}.ts
│     ├─ financeiro.ts          # gerador idempotente de faturas
│     ├─ asaas.ts               # integração PIX (estrutura pronta)
│     ├─ types.ts
│     └─ utils.ts
```

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Adicione as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ASSAAS_API_KEY`, `ASSAAS_WEBHOOK_SECRET`).
3. Deploy automático pronto.