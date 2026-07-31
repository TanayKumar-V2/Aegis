"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Check, ClipboardCheck, LockKeyhole, ShieldCheck, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/theme-toggle";

const steps = [
  {
    number: "01",
    title: "You choose who sees what",
    description: "Patients grant doctors scoped access to the records that matter, and can revoke it at any time.",
  },
  {
    number: "02",
    title: "Specialists stay in sync",
    description: "A shared timeline gives every active care partner the context they need without another phone call.",
  },
  {
    number: "03",
    title: "Conflicts surface early",
    description: "Aegis checks new prescriptions against active medications and flags potentially dangerous combinations.",
  },
];

export default function Home() {
  const router = useRouter();
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;

    fetchCurrentUser()
      .then(() => router.replace("/dashboard"))
      .catch(() => undefined);
  }, [fetchCurrentUser, router]);

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Aegis home">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Stethoscope className="size-5" strokeWidth={2.25} />
          </span>
          <span className="text-xl font-semibold tracking-tight text-slate-800">aegis</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          <ThemeToggle />
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/70 hover:text-slate-900">
            Sign in
          </Link>
          <Link href="/register" className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700">
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Care, connected carefully
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-900 sm:text-6xl lg:text-7xl">
            Every specialist sees the care story, not just their chapter.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            Aegis gives patients control of their records while helping care teams catch prescription conflicts before they become a problem.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="h-12 w-full rounded-full px-6 sm:w-auto">
                Get started <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/login" className="flex h-12 items-center justify-center rounded-full border border-slate-300/80 bg-white/70 px-6 text-sm font-semibold text-slate-700 transition hover:border-primary/40 hover:bg-white sm:w-auto">
              Sign in to Aegis
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {["Patient-owned permissions", "Cross-specialist context", "Actionable safety alerts"].map((item) => (
              <span key={item} className="flex items-center gap-2"><Check className="size-4 text-emerald-600" />{item}</span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-primary/10 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Patient overview</p>
                <p className="mt-1 text-lg font-semibold text-slate-800">Maya’s care circle</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">3 active</span>
            </div>
            <div className="space-y-3 py-5">
              {[
                ["Dr. Lena Ortiz", "Cardiology", "Full access", "bg-sky-100 text-sky-700"],
                ["Dr. Samir Shah", "Neurology", "Notes only", "bg-violet-100 text-violet-700"],
                ["Dr. Elise Park", "Primary care", "Prescriptions", "bg-amber-100 text-amber-700"],
              ].map(([name, specialty, scope, color]) => (
                <div key={name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <span className={`flex size-10 items-center justify-center rounded-xl text-sm font-semibold ${color}`}>{name.split(" ").map((part) => part[0]).join("")}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{name}</p><p className="text-xs text-slate-500">{specialty}</p></div>
                  <span className="text-right text-[11px] font-medium text-slate-400">{scope}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4">
              <div className="flex items-start gap-3"><span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><ShieldCheck className="size-4" /></span><div><p className="text-sm font-semibold text-amber-950">Medication review needed</p><p className="mt-1 text-xs leading-5 text-amber-800/80">A new prescription needs a second look against Maya’s active list.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/45 px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">How Aegis works</p><h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">A calmer way to coordinate complex care.</h2></div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step) => <div key={step.number} className="rounded-3xl border border-slate-200/80 bg-white/70 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/5"><span className="text-sm font-semibold text-primary">{step.number}</span><h3 className="mt-8 text-xl font-semibold text-slate-800">{step.title}</h3><p className="mt-3 leading-7 text-slate-600">{step.description}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div className="rounded-[2rem] bg-slate-800 p-8 text-white shadow-xl shadow-slate-900/10 sm:p-10"><LockKeyhole className="size-7 text-teal-300" /><h2 className="mt-8 text-3xl font-semibold tracking-tight">Your records. Your permissions.</h2><p className="mt-4 leading-7 text-slate-300">Aegis makes access visible, scoped, and revocable. Every meaningful action leaves an audit trail you can review.</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-300 hover:text-teal-200">Create your account <ArrowRight className="size-4" /></Link></div>
        <div className="grid gap-5 sm:grid-cols-2 sm:content-center"><div className="rounded-3xl border border-slate-200/80 bg-white/65 p-7"><ClipboardCheck className="size-6 text-primary" /><h3 className="mt-6 text-lg font-semibold text-slate-800">An accountable timeline</h3><p className="mt-2 text-sm leading-6 text-slate-600">Notes, prescriptions, and decisions stay connected to the people who made them.</p></div><div className="rounded-3xl border border-slate-200/80 bg-white/65 p-7"><ShieldCheck className="size-6 text-primary" /><h3 className="mt-6 text-lg font-semibold text-slate-800">Safety signals with context</h3><p className="mt-2 text-sm leading-6 text-slate-600">Potential medication conflicts are surfaced with enough detail to act thoughtfully.</p></div></div>
      </section>

      <section className="px-6 pb-24 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:items-center sm:px-12"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">Better coordinated care starts here</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">Make every handoff feel intentional.</h2></div><Link href="/register" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">Get started <ArrowRight className="size-4" /></Link></div></section>

      <footer className="border-t border-slate-200/70 px-6 py-7 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-700">aegis</span><span>Built for clearer, safer collaboration in care.</span></div></footer>
    </main>
  );
}
