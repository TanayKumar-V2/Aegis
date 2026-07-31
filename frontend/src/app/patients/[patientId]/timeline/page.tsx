"use client";

import Link from "next/link";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CalendarDays, ClipboardList, FilePlus2, Loader2, Pill, ShieldAlert, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import type { ClinicalEntry, EntryType, InteractionFlag, FlagSeverity, MedicationCreateResponse } from "@/types/clinical";

const entrySchema = z.object({ entry_type: z.enum(["note", "prescription", "diagnosis", "test_order"]), title: z.string().min(1, "Add a title."), content: z.string().min(1, "Add some clinical context.") });
const medicationSchema = z.object({ drug_name: z.string().min(1, "Add a medication name."), dosage: z.string().min(1, "Add a dosage."), frequency: z.string().min(1, "Add a frequency."), start_date: z.string().min(1, "Choose a start date."), end_date: z.string().optional() });
const resolutionSchema = z.object({ resolution_note: z.string().max(1000, "Keep the note under 1,000 characters.").optional() });
type EntryForm = z.infer<typeof entrySchema>;
type MedicationForm = z.infer<typeof medicationSchema>;
type ResolutionForm = z.infer<typeof resolutionSchema>;

const entryLabels: Record<EntryType, string> = { note: "Note", prescription: "Prescription", diagnosis: "Diagnosis", test_order: "Test order" };
const entryColors: Record<EntryType, string> = { note: "border-l-sky-400", prescription: "border-l-violet-400", diagnosis: "border-l-amber-400", test_order: "border-l-emerald-400" };
const severityClasses: Record<FlagSeverity, string> = { mild: "border-sky-200 bg-sky-50 text-sky-900", moderate: "border-amber-200 bg-amber-50 text-amber-950", severe: "border-red-200 bg-red-50 text-red-950" };

function formatDate(value: string) {
  try { return format(new Date(value), "MMM d, yyyy · h:mm a"); } catch { return value; }
}

function ForbiddenState() {
  return <main className="flex min-h-screen items-center justify-center px-6"><Card className="max-w-lg border-amber-200 bg-amber-50/80"><CardHeader><CardTitle className="flex items-center gap-2 text-amber-950"><ShieldAlert className="size-5" /> You don’t have access to this record</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-amber-900/80">Your session is valid, but this patient has not granted you active access for this timeline. Ask the patient to review your care-circle permission.</CardContent></Card>;</main>;
}

function ActiveAlerts({ flags, canResolve, onResolve }: { flags: InteractionFlag[]; canResolve: boolean; onResolve: (flag: InteractionFlag) => void }) {
  const [selectedFlag, setSelectedFlag] = useState<InteractionFlag | null>(null);
  const unresolved = flags.filter((flag) => !flag.resolved);
  if (unresolved.length === 0) return null;

  return <><Card className="border-red-200/80 bg-red-50/70 shadow-sm"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><ShieldAlert className="size-5" /></span><div><p className="text-sm font-semibold text-red-950">Active alerts</p><p className="mt-1 text-sm leading-6 text-red-900/75">{unresolved.length} medication interaction{unresolved.length === 1 ? " needs" : "s need"} review before the next decision.</p></div></div><Button variant="outline" className="shrink-0 rounded-xl border-red-200 bg-white/60 text-red-900 hover:bg-white" onClick={() => setSelectedFlag(unresolved[0])}>Review alerts</Button></CardContent></Card><Dialog open={Boolean(selectedFlag)} onOpenChange={(open) => !open && setSelectedFlag(null)}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Medication interaction alerts</DialogTitle><DialogDescription>Review the clinical context before resolving an alert.</DialogDescription></DialogHeader><div className="space-y-3">{unresolved.map((flag) => <button key={flag.id} type="button" className={`w-full rounded-2xl border p-4 text-left transition hover:shadow-sm ${severityClasses[flag.severity]}`} onClick={() => setSelectedFlag(flag)}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.14em]">{flag.severity} severity</span><span className="text-xs opacity-70">{formatDate(flag.flagged_at)}</span></div><p className="mt-3 text-sm leading-6">{flag.description}</p>{flag.id === selectedFlag?.id && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-3"><span className="text-xs opacity-70">Flag ID {flag.id.slice(0, 8)}…</span>{canResolve ? <Button type="button" size="sm" className="rounded-lg bg-slate-900 text-white hover:bg-slate-800" onClick={(event) => { event.stopPropagation(); onResolve(flag); setSelectedFlag(null); }}>Resolve alert</Button> : <span className="text-xs font-medium opacity-70">Doctor review required</span>}</div>}</button>)}</div></DialogContent></Dialog></>;
}

function ResolveDialog({ flag, onClose, onResolved }: { flag: InteractionFlag | null; onClose: () => void; onResolved: (flag: InteractionFlag) => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResolutionForm>({ resolver: zodResolver(resolutionSchema) });
  useEffect(() => { reset({ resolution_note: "" }); }, [flag, reset]);
  if (!flag) return null;
  const activeFlag = flag;

  async function resolve(values: ResolutionForm) {
    setIsSaving(true);
    try { const { data } = await api.patch<InteractionFlag>(`/patients/${activeFlag.patient_id}/flags/${activeFlag.id}/resolve`, values); onResolved(data); toast.success("Alert marked as resolved."); onClose(); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not resolve this alert.")); }
    finally { setIsSaving(false); }
  }

  return <Dialog open={Boolean(activeFlag)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Resolve interaction alert</DialogTitle><DialogDescription>{activeFlag.description}</DialogDescription></DialogHeader><form onSubmit={handleSubmit(resolve)} className="space-y-4"><div><Label htmlFor="resolution_note">Resolution note <span className="font-normal text-slate-400">(optional)</span></Label><Textarea id="resolution_note" placeholder="Add the clinical reasoning or follow-up…" className="mt-2 min-h-28" {...register("resolution_note")} />{errors.resolution_note && <p className="mt-1.5 text-xs text-destructive">{errors.resolution_note.message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}Confirm resolution</Button></DialogFooter></form></DialogContent></Dialog>;
}

function NewEntryDialog({ patientId, onCreated }: { patientId: string; onCreated: (entry: ClinicalEntry) => void }) {
  const [open, setOpen] = useState(false);
  const [createdEntry, setCreatedEntry] = useState<ClinicalEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [medication, setMedication] = useState<MedicationForm>({ drug_name: "", dosage: "", frequency: "", start_date: "", end_date: "" });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntryForm>({ resolver: zodResolver(entrySchema), defaultValues: { entry_type: "note" } });

  function close() { setOpen(false); setCreatedEntry(null); reset({ entry_type: "note", title: "", content: "" }); setMedication({ drug_name: "", dosage: "", frequency: "", start_date: "", end_date: "" }); }

  async function createEntry(values: EntryForm) {
    setIsSaving(true);
    try { const { data } = await api.post<ClinicalEntry>(`/patients/${patientId}/entries`, values); onCreated(data); setCreatedEntry(data); toast.success("Timeline entry created."); if (values.entry_type !== "prescription") close(); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not create this entry.")); }
    finally { setIsSaving(false); }
  }

  async function addMedication() {
    const result = medicationSchema.safeParse(medication);
    if (!result.success) { toast.error(result.error.issues[0]?.message || "Complete the medication details."); return; }
    if (!createdEntry) return;
    setIsSaving(true);
    try { const { data } = await api.post<MedicationCreateResponse>(`/patients/${patientId}/entries/${createdEntry.id}/medications`, { ...result.data, end_date: result.data.end_date || null }); if (data.new_interaction_flags.length) toast.warning(`${data.new_interaction_flags.length} interaction alert created.`); else toast.success("Medication added."); close(); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not add this medication.")); }
    finally { setIsSaving(false); }
  }

  return <><Button className="rounded-xl" onClick={() => setOpen(true)}><FilePlus2 className="mr-2 size-4" />New entry</Button><Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{createdEntry ? "Add a medication" : "Create timeline entry"}</DialogTitle><DialogDescription>{createdEntry ? "Add the prescription details so Aegis can check for medication interactions." : "Add a plain-text clinical note, diagnosis, test order, or prescription."}</DialogDescription></DialogHeader>{!createdEntry ? <form onSubmit={handleSubmit(createEntry)} className="space-y-4" noValidate><div><Label htmlFor="entry_type">Entry type</Label><Select defaultValue="note" onValueChange={(value) => reset({ entry_type: value as EntryForm["entry_type"], title: "", content: "" })}><SelectTrigger id="entry_type" className="mt-2 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Note</SelectItem><SelectItem value="prescription">Prescription</SelectItem><SelectItem value="diagnosis">Diagnosis</SelectItem><SelectItem value="test_order">Test order</SelectItem></SelectContent></Select><input type="hidden" {...register("entry_type")} /></div><div><Label htmlFor="title">Title</Label><Input id="title" className="mt-2 h-11" placeholder="Follow-up consultation" {...register("title")} />{errors.title && <p className="mt-1.5 text-xs text-destructive">{errors.title.message}</p>}</div><div><Label htmlFor="content">Clinical context</Label><Textarea id="content" className="mt-2 min-h-32" placeholder="Write the relevant details…" {...register("content")} />{errors.content && <p className="mt-1.5 text-xs text-destructive">{errors.content.message}</p>}</div><DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}Create entry</Button></DialogFooter></form> : <div className="space-y-4"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Prescription created</p><p className="mt-1">{createdEntry.title}</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="drug_name">Medication</Label><div className="relative mt-2"><Pill className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="drug_name" className="h-11 pl-9" placeholder="Warfarin" value={medication.drug_name} onChange={(event) => setMedication({ ...medication, drug_name: event.target.value })} /></div></div><div><Label htmlFor="dosage">Dosage</Label><Input id="dosage" className="mt-2 h-11" placeholder="5mg" value={medication.dosage} onChange={(event) => setMedication({ ...medication, dosage: event.target.value })} /></div><div><Label htmlFor="frequency">Frequency</Label><Input id="frequency" className="mt-2 h-11" placeholder="Once daily" value={medication.frequency} onChange={(event) => setMedication({ ...medication, frequency: event.target.value })} /></div><div><Label htmlFor="start_date">Start date</Label><Input id="start_date" type="date" className="mt-2 h-11" value={medication.start_date} onChange={(event) => setMedication({ ...medication, start_date: event.target.value })} /></div><div><Label htmlFor="end_date">End date <span className="font-normal text-slate-400">(optional)</span></Label><Input id="end_date" type="date" className="mt-2 h-11" value={medication.end_date} onChange={(event) => setMedication({ ...medication, end_date: event.target.value })} /></div></div><DialogFooter><Button type="button" variant="outline" onClick={close}>Skip medication</Button><Button type="button" disabled={isSaving} onClick={addMedication}>{isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}Add medication</Button></DialogFooter></div>}</DialogContent></Dialog></>;
}

export default function TimelinePage() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const [entries, setEntries] = useState<ClinicalEntry[]>([]);
  const [flags, setFlags] = useState<InteractionFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [resolveFlag, setResolveFlag] = useState<InteractionFlag | null>(null);

  const loadTimeline = useCallback(async () => {
    setIsLoading(true); setForbidden(false);
    try { const [entriesResponse, flagsResponse] = await Promise.all([api.get<ClinicalEntry[]>(`/patients/${patientId}/entries`), api.get<InteractionFlag[]>(`/patients/${patientId}/flags`)]); setEntries(entriesResponse.data); setFlags(flagsResponse.data); }
    catch (error: unknown) { if (axios.isAxiosError(error) && error.response?.status === 403) setForbidden(true); else toast.error(getApiErrorMessage(error, "We could not load this timeline.")); }
    finally { setIsLoading(false); }
  }, [patientId]);

  useEffect(() => { const timer = window.setTimeout(() => { if (!localStorage.getItem("access_token")) { router.replace("/login"); return; } if (!user) { fetchCurrentUser().catch(() => undefined); return; } void loadTimeline(); }, 0); return () => window.clearTimeout(timer); }, [fetchCurrentUser, loadTimeline, router, user]);

  const unresolvedCount = useMemo(() => flags.filter((flag) => !flag.resolved).length, [flags]);
  function onResolved(updated: InteractionFlag) { setFlags((current) => current.map((flag) => flag.id === updated.id ? updated : flag)); setResolveFlag(null); }

  if (forbidden) return <ForbiddenState />;
  if (isLoading || !user) return <><DashboardHeader /><main className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10"><Skeleton className="h-10 w-72" /><Skeleton className="mt-8 h-32 rounded-3xl" /><div className="mt-8 space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-40 rounded-3xl" /></div></main></>;

  return <><DashboardHeader /><main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft className="size-4" />Back to workspace</Link><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Shared patient timeline</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Care record</h1><p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><span className="size-2 rounded-full bg-emerald-500" />Patient ID {patientId}</p></div>{user.role === "doctor" && <NewEntryDialog patientId={patientId} onCreated={(entry) => setEntries((current) => [entry, ...current])} />}</div><div className="space-y-6"><ActiveAlerts flags={flags} canResolve={user.role === "doctor"} onResolve={setResolveFlag} /><Card className="border-white/80 bg-white/75 shadow-sm"><CardContent className="p-5 sm:p-7"><div className="mb-8 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-slate-800">Activity</h2><p className="mt-1 text-sm text-slate-500">Newest entries first</p></div>{unresolvedCount > 0 && <Badge variant="destructive">{unresolvedCount} active alert{unresolvedCount === 1 ? "" : "s"}</Badge>}</div>{entries.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center"><ClipboardList className="mx-auto size-7 text-slate-400" /><p className="mt-4 font-medium text-slate-700">No timeline entries yet</p><p className="mt-1 text-sm text-slate-500">Clinical notes and prescriptions will appear here.</p></div> : <div className="space-y-5">{entries.map((entry) => <article key={entry.id} className={`relative border-l-4 pl-5 ${entryColors[entry.entry_type]}`}><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="bg-white/80">{entryLabels[entry.entry_type]}</Badge><Badge variant="secondary">{entry.specialty_tag}</Badge></div><h3 className="mt-3 text-lg font-semibold text-slate-800">{entry.title}</h3></div><time className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="size-3.5" />{formatDate(entry.created_at)}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{entry.content}</p><p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Stethoscope className="size-3.5" />Authored by {entry.author_id.slice(0, 8)}…</p></article>)}</div>}</CardContent></Card></div></main><ResolveDialog flag={resolveFlag} onClose={() => setResolveFlag(null)} onResolved={onResolved} /></>;
}
