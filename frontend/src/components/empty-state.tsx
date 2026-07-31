import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  description?: string;
}

export function EmptyState({ icon: Icon, message, description }: EmptyStateProps) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center"><Icon className="mx-auto size-7 text-slate-500" /><p className="mt-4 text-sm font-medium text-slate-700">{message}</p>{description && <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>}</div>;
}
