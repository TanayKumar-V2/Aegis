import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ children, eyebrow, title, description }: { children: React.ReactNode; eyebrow: string; title: string; description: string }) {
  return <main className="min-h-screen px-6 py-8 sm:py-12"><div className="mx-auto max-w-6xl"><div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-3.5"><span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Stethoscope className="size-[1.375rem]" strokeWidth={2.4} /></span><BrandWordmark /></Link><ThemeToggle /></div><div className="mt-12 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div className="max-w-md"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{title}</h1><p className="mt-5 text-lg leading-8 text-slate-600">{description}</p><div className="mt-8 hidden rounded-2xl border border-primary/15 bg-white/60 p-5 text-sm leading-6 text-slate-600 lg:block">Aegis keeps the patient in control while giving the care team a shared, trustworthy view.</div></div><div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-9">{children}</div></div></div></main>;
}
