"use client";

import Link from "next/link";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { Activity, ArrowLeft, CheckCircle2, ChevronDown, ClipboardList, FilePlus2, LockKeyhole, ShieldAlert, SlidersHorizontal, UserRound } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import type { AuditLogEntry } from "@/types/audit";

const actionLabels: Record<string, string> = {
  viewed_timeline: "Viewed timeline",
  created_entry: "Created timeline entry",
  revoked_access: "Revoked care access",
  permission_scope_changed: "Changed permission scope",
  resolved_flag: "Resolved interaction alert",
};

function ActionIcon({ action }: { action: string }) {
  if (action === "viewed_timeline") return <Activity className="size-4" />;
  if (action === "created_entry") return <FilePlus2 className="size-4" />;
  if (action === "revoked_access") return <LockKeyhole className="size-4" />;
  if (action === "permission_scope_changed") return <SlidersHorizontal className="size-4" />;
  if (action === "resolved_flag") return <CheckCircle2 className="size-4" />;
  return <ClipboardList className="size-4" />;
}

function formatDate(value: string) {
  try { return format(new Date(value), "MMM d, yyyy · h:mm a"); } catch { return value; }
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const metadata = entry.metadata_json ? JSON.stringify(entry.metadata_json, null, 2) : null;

  return <div className="group flex gap-4"><div className="relative flex w-10 shrink-0 justify-center"><span className="z-10 flex size-9 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><ActionIcon action={entry.action} /></span></div><div className="min-w-0 flex-1 pb-7"><div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md hover:shadow-slate-900/5"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="font-semibold text-slate-800">{actionLabels[entry.action] || entry.action.replaceAll("_", " ")}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">{formatDate(entry.timestamp)} <span aria-hidden="true">·</span> Actor {entry.actor_id.slice(0, 8)}…</p></div><Badge variant="outline" className="w-fit text-[11px]">{entry.action}</Badge></div>{metadata && <><Separator className="my-4" /><button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-500 transition hover:text-primary"><span>{expanded ? "Hide details" : "Show event details"}</span><ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></button>{expanded && <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">{metadata}</pre>}</>}</div></div></div>;
}

function ForbiddenState() {
  return <main className="flex min-h-screen items-center justify-center px-6"><Card className="max-w-lg border-amber-200 bg-amber-50/80"><CardHeader><CardTitle className="flex items-center gap-2 text-amber-950"><ShieldAlert className="size-5" /> Audit log unavailable</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-amber-900/80">Only the patient can view this audit trail. Doctors and other care partners are intentionally denied, even when they have active record access.</CardContent></Card>;</main>;
}

export default function AuditLogPage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const [events, setEvents] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLog = useCallback(async () => {
    setIsLoading(true); setError(null); setForbidden(false);
    try { const { data } = await api.get<AuditLogEntry[]>(`/patients/${patientId}/audit-log`); setEvents(data); }
    catch (requestError: unknown) { if (axios.isAxiosError(requestError) && requestError.response?.status === 403) setForbidden(true); else setError(getApiErrorMessage(requestError, "We could not load your audit log.")); }
    finally { setIsLoading(false); }
  }, [patientId]);

  useEffect(() => { const timer = window.setTimeout(() => { if (!localStorage.getItem("access_token")) { router.replace("/login"); return; } if (!user) { fetchCurrentUser().catch(() => undefined); return; } void loadAuditLog(); }, 0); return () => window.clearTimeout(timer); }, [fetchCurrentUser, loadAuditLog, router, user]);

  if (forbidden) return <ForbiddenState />;
  if (isLoading || !user) return <><DashboardHeader /><main className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10"><Skeleton className="h-10 w-64" /><Skeleton className="mt-8 h-24 rounded-3xl" /><div className="mt-8 space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-32 rounded-3xl" /></div></main></>;

  return <><DashboardHeader /><main className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-10"><Link href={`/patients/${patientId}/timeline`} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft className="size-4" />Back to timeline</Link><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Patient oversight</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Audit log</h1><p className="mt-3 max-w-xl text-slate-600">A transparent record of who accessed and changed your care information.</p></div><Badge variant="outline" className="w-fit"><UserRound className="mr-1.5 size-3.5" />Patient only</Badge></div>{error && <Alert variant="destructive" className="mb-6"><AlertTitle>Unable to load audit log</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}{events.length === 0 ? <Card className="border-white/80 bg-white/75 shadow-sm"><CardContent className="py-16 text-center"><ClipboardList className="mx-auto size-8 text-slate-400" /><p className="mt-4 font-medium text-slate-700">No audit events yet</p><p className="mt-1 text-sm text-slate-500">Activity will appear here as your care record is used.</p></CardContent></Card> : <Card className="border-white/80 bg-white/75 shadow-sm"><CardContent className="p-5 sm:p-8"><div className="relative">{events.map((entry, index) => <div key={entry.id} className="relative">{index < events.length - 1 && <span className="absolute bottom-0 left-5 top-9 w-px bg-slate-200" aria-hidden="true" />}<AuditRow entry={entry} /></div>)}</div></CardContent></Card>}<p className="mt-6 text-center text-xs text-slate-400">Event details are shown as plain text and are never rendered as HTML.</p></main></>;
}
