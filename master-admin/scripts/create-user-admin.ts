/**
 * SCRIPT TEMPORÁRIO (admin): destrava o login do admin do painel.
 *
 * Faça e garante:
 *   1. Cria o usuário se não existir (com e-mail confirmado).
 *   2. Se já existe: confirma o e-mail (email_confirm) e redefine a senha.
 *   3. Insere o usuário em public.administradores (libera o acesso via RLS).
 *
 * Uso:
 *   npx tsx scripts/create-user-admin.ts <email> <senha>
 *
 * Requer no .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL          (já configurado)
 *   SUPABASE_SERVICE_ROLE_KEY         (Project Settings > API > service_role secret)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function carregarEnvLocal(): void {
  const caminho = join(process.cwd(), ".env.local");
  try {
    const conteudo = readFileSync(caminho, "utf8");
    for (const linha of conteudo.split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // Sem .env.local: usa apenas variáveis já existentes no ambiente.
  }
}

async function main(): Promise<void> {
  carregarEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? "dannavaarro@gmail.com";
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "MasterAdmin1!";

  if (!url) throw new Error("Faltando NEXT_PUBLIC_SUPABASE_URL no .env.local");
  if (!serviceKey) throw new Error("Faltando SUPABASE_SERVICE_ROLE_KEY no .env.local");
  if (email.length < 5 || !email.includes("@")) throw new Error(`E-mail inválido: ${email}`);
  if (password.length < 6) throw new Error("A senha precisa de ao menos 6 caracteres.");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;

  // 1) Tenta criar o usuário (e-mail já confirmado).
  const { data: criado, error: errCreate } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (criado?.user) {
    userId = criado.user.id;
    console.log("1/3 Usuário criado com e-mail confirmado.");
  } else {
    console.log("1/3 Usuário já existia:", errCreate?.message ?? "sem detalhe");
  }

  // 2) Se já existia, localiza, confirma e-mail e redefine a senha.
  if (!userId) {
    const { data: lista, error: errLista } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (errLista) throw errLista;

    const existente = lista.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!existente) throw new Error(`Não localizei ${email} e não consegui criá-lo.`);

    const { data: atualizado, error: errUpdate } = await supabase.auth.admin.updateUserById(
      existente.id,
      { email_confirm: true, password }
    );
    if (errUpdate) throw errUpdate;
    userId = atualizado.user.id;
    console.log("2/3 E-mail confirmado e senha redefinida no usuário existente.");
  } else {
    console.log("2/3 Já confirmado na criação.");
  }

  // 3) Insere em administradores (libera o login via RLS).
  const { error: errAdmin } = await supabase
    .from("administradores")
    .upsert({ id: userId, email: email.toLowerCase() }, { onConflict: "id" });

  if (errAdmin) {
    console.error("3/3 Aviso: falha ao inserir em administradores:", errAdmin.message);
  } else {
    console.log("3/3 Acesso liberado em public.administradores.");
  }

  const verifica = await supabase
    .from("administradores")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  console.log("");
  console.log("Pronto! Use no login:");
  console.log(`   http://localhost:3000/login`);
  console.log(`   E-mail:   ${email}`);
  console.log(`   Senha:    ${password}`);
  if (!verifica?.data) {
    console.log("   (Aviso: RLS não reconheceu o admin nesta checagem.)");
  }
}

main().catch((e) => {
  console.error("\nERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});