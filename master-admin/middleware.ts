import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; httpOnly?: boolean; sameSite?: "lax" | "strict" | "none" };
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: use getUser() (valida no Supabase), nunca getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = request.nextUrl.pathname.startsWith("/admin");
  const isLogin = request.nextUrl.pathname === "/login";

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Verifica se o usuário logado realmente é administrador.
  const ehAdmin = (async () => {
    if (!user) return false;
    const { data: admin } = await supabase
      .from("administradores")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    return Boolean(admin);
  })();

  if (!(await ehAdmin) && isProtected) {
    // Sessão válida, mas não é admin: tenta limpar os cookies.
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Somente admin com sessão válida sai de /login.
  if (user && isLogin && (await ehAdmin)) {
    const next = request.nextUrl.searchParams.get("next") || "/admin";
    const url = request.nextUrl.clone();
    url.pathname = next.startsWith("/admin") ? next : "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};