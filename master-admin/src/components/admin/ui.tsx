import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-white/5 bg-card/60 backdrop-blur", className)}>
      {children}
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const ACCENTS = {
  electric: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
  neon: "bg-[#3B82F6]/15 text-[#3B82F6]",
  emerald: "bg-emerald-400/15 text-emerald-400",
  amber: "bg-amber-400/15 text-amber-400",
  red: "bg-red-400/15 text-red-400",
} as const;

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "electric",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof ACCENTS;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-3xl font-extrabold text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", ACCENTS[accent])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}