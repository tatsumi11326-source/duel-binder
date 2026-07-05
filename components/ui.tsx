import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-normal text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className={buttonClass}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      {action ? (
        <Link href={action.href} className="text-xs font-semibold text-amber-400 hover:text-amber-300">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-[#2f302e] bg-[#171818] p-4 shadow-lg shadow-black/20">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-400">{label}</p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function AppCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rounded-lg border border-[#2f302e] bg-[#171818] ${className}`}>{children}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#30312f] bg-[#171818] p-8 text-center text-sm text-zinc-400">
      {message}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-[#30312f] bg-[#151616] px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none placeholder:text-zinc-600 focus:border-amber-400";

export const labelClass = "text-sm font-semibold text-zinc-300";

export const buttonClass =
  "inline-flex shrink-0 items-center justify-center rounded-md bg-amber-400 px-4 py-2 text-sm font-bold text-[#111111] hover:bg-amber-300";

export const secondaryButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-[#30312f] bg-[#181918] px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-amber-400 hover:text-amber-300";
