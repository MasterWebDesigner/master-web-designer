import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Acesso Restrito",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      {/* Orbs de fundo */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#8B5CF6] opacity-30 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-[#3B82F6] opacity-25 blur-[90px]" />

      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#8B5CF6]/20 bg-card/60 p-8 shadow-[0_0_40px_rgba(139,92,246,0.15)] backdrop-blur sm:p-10">
          <div className="mb-8 text-center">
            <img
              src="/Logo5.3.png"
              alt="Logo Master Web Designer"
              className="mx-auto mb-4 h-14 w-auto max-w-[12rem] object-contain drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]"
            />
            <h1 className="text-xl font-extrabold text-white">
              Master <span className="text-[#c4b5fd]">Web Designer</span>
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Painel do Administrador
            </p>
          </div>

          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Acesso restrito à equipe Master Web Designer. © Daniel Navarro
        </p>
      </div>
    </main>
  );
}