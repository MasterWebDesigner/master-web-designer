"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "@/app/actions";
import {
  CashIcon,
  DashboardIcon,
  LogoutIcon,
  MenuIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "gap-2.5")}>
      <img
        src="/Logo5.3.png"
        alt="Logo Master Web Designer"
        className="h-10 w-auto max-w-[10rem] object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.35)]"
      />
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">
          Master <span className="text-[#c4b5fd]">Web Designer</span>
        </p>
        <p className="text-[11px] text-slate-500">by Daniel Navarro</p>
      </div>
    </div>
  );
}

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = [
    { href: "/admin", label: "Dashboard", icon: <DashboardIcon className="h-5 w-5" /> },
    { href: "/admin/clientes", label: "Clientes & Sites", icon: <UsersIcon className="h-5 w-5" /> },
    { href: "/admin/financeiro", label: "Faturamento", icon: <CashIcon className="h-5 w-5" /> },
  ];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Barra superior mobile */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-base/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300"
            aria-label="Abrir menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Brand compact />
        </div>
      </div>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Menu lateral */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-[#0B1020]/95 backdrop-blur transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Brand />
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 lg:hidden"
            aria-label="Fechar menu"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 px-4">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "border-[#8B5CF6]/30 bg-gradient-to-r from-[#8B5CF6]/20 to-[#3B82F6]/10 text-white"
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-white/5 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] text-xs font-bold text-white">
              DN
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{email}</p>
              <p className="text-xs text-slate-500">Administrador</p>
            </div>
          </div>
          <form action={sair}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
            >
              <LogoutIcon className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}