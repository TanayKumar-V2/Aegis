"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, ArrowRight, Check, ClipboardList, Clock3, FileText, Link2, Loader2, Plus, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import type { CareCircle, PermissionScope } from "@/types/care";

const inviteSchema = z.object({ doctor_email: z.string().email("Enter a valid doctor email."), permission_scope: z.enum(["full", "notes_only", "prescriptions_only"]) });
const acceptSchema = z.object({ circle_id: z.string().uuid("Enter a valid care-circle ID.") });
type InviteForm = z.infer<typeof inviteSchema>;
type AcceptForm = z.infer<typeof acceptSchema>;

const scopeLabels: Record<PermissionScope, string> = { full: "Full access", notes_only: "Notes only", prescriptions_only: "Prescriptions only" };

function AccessBadge({ status, scope }: { status: CareCircle["status"]; scope: PermissionScope }) {
  return <div className="flex items-center gap-2"><Badge variant={status === "active" ? "secondary" : status === "pending" ? "outline" : "destructive"} className="capitalize">{status}</Badge><span className="text-xs text-slate-500">{scopeLabels[scope]}</span></div>;
}

function PatientDashboard({ userId }: { userId: string }) {
  const [circles, setCircles] = useState<CareCircle[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { permission_scope: "full" } });

  async function inviteDoctor(values: InviteForm) {
    setIsInviting(true);
    try {
      const { data } = await api.post<CareCircle>(`/patients/${userId}/invite-doctor`, values);
      setCircles((current) => [data, ...current]);
      toast.success("Doctor invited to your care circle.");
    } catch (error) { toast.error(getApiErrorMessage(error, "We could not send that invitation.")); }
    finally { setIsInviting(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"><div className="space-y-6"><Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Bring your care team together</CardTitle><CardDescription className="mt-2">Invite a doctor and choose exactly how much of your record they can access.</CardDescription></div><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span></div></CardHeader><CardContent><form onSubmit={handleSubmit(inviteDoctor)} className="space-y-4" noValidate><div><Label htmlFor="doctor_email">Doctor email</Label><Input id="doctor_email" type="email" placeholder="doctor@clinic.com" className="mt-2 h-11" {...register("doctor_email")} />{errors.doctor_email && <p className="mt-1.5 text-xs text-destructive">{errors.doctor_email.message}</p>}</div><div><Label htmlFor="permission_scope">Access scope</Label><Select defaultValue="full" onValueChange={(value) => setValue("permission_scope", value as InviteForm["permission_scope"], { shouldValidate: true })}><SelectTrigger id="permission_scope" className="mt-2 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full access</SelectItem><SelectItem value="notes_only">Notes only</SelectItem><SelectItem value="prescriptions_only">Prescriptions only</SelectItem></SelectContent></Select></div><Button type="submit" disabled={isInviting} className="rounded-xl">{isInviting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Invite doctor</Button></form></CardContent></Card><Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><CardTitle>Care circle</CardTitle><CardDescription className="mt-2">Invitations created during this session appear here.</CardDescription></CardHeader><CardContent>{circles.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-7 text-center"><Clock3 className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-medium text-slate-700">No invitations yet</p><p className="mt-1 text-xs leading-5 text-slate-500">Once a doctor accepts, their active access will show here.</p></div> : <div className="space-y-3">{circles.map((circle) => <div key={circle.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">Doctor {circle.doctor_id.slice(0, 8)}…</p><p className="mt-1 text-xs text-slate-500">Circle {circle.id.slice(0, 8)}…</p></div><AccessBadge status={circle.status} scope={circle.permission_scope} /></div>)}</div>}<p className="mt-5 text-xs leading-5 text-slate-400">TODO: replace session-created circles with a backend list endpoint when one is available.</p></CardContent></Card></div><div className="space-y-6"><Card className="border-primary/15 bg-primary/5 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Your control center</CardTitle><CardDescription className="mt-2">You own the access decisions. Changes are recorded in your audit trail.</CardDescription></CardHeader><CardContent className="space-y-3"><Link href={`/patients/${userId}/timeline`} className="flex items-center justify-between rounded-xl bg-white/75 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-primary"><span className="flex items-center gap-3"><Activity className="size-4 text-primary" />Open my timeline</span><ArrowRight className="size-4" /></Link><Link href={`/patients/${userId}/audit-log`} className="flex items-center justify-between rounded-xl bg-white/75 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-primary"><span className="flex items-center gap-3"><ClipboardList className="size-4 text-primary" />Review audit log</span><ArrowRight className="size-4" /></Link></CardContent></Card><Alert className="border-emerald-200/70 bg-emerald-50/60 text-emerald-950"><Check className="size-4" /><AlertTitle>Patient-owned by design</AlertTitle><AlertDescription className="text-emerald-900/75">Access can be narrowed or revoked whenever your care needs change.</AlertDescription></Alert></div></div>;
}

function DoctorDashboard() {
  const [patientId, setPatientId] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AcceptForm>({ resolver: zodResolver(acceptSchema) });

  async function acceptInvite(values: AcceptForm) {
    setIsAccepting(true);
    try { await api.post(`/patients/care-circles/${values.circle_id}/accept`); toast.success("Care-circle invitation accepted."); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not accept that invitation.")); }
    finally { setIsAccepting(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Open a patient record</CardTitle><CardDescription className="mt-2">Enter a patient ID they have shared with you to view their active timeline.</CardDescription></div><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search className="size-5" /></span></div></CardHeader><CardContent><div className="space-y-4"><div><Label htmlFor="patient_id">Patient ID</Label><Input id="patient_id" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-2 h-11" /></div><Link href={patientId.trim() ? `/patients/${patientId.trim()}/timeline` : "#"} aria-disabled={!patientId.trim()} onClick={(event) => { if (!patientId.trim()) event.preventDefault(); }} className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-white transition ${patientId.trim() ? "bg-primary hover:bg-primary/85" : "cursor-not-allowed bg-slate-300"}`}><Link2 className="mr-2 size-4" />View patient timeline</Link></div></CardContent></Card><div className="space-y-6"><Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><CardTitle>Accept an invitation</CardTitle><CardDescription className="mt-2">Paste the care-circle ID from your patient.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit(acceptInvite)} className="space-y-4" noValidate><div><Label htmlFor="circle_id">Care-circle ID</Label><Input id="circle_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-2 h-11" {...register("circle_id")} />{errors.circle_id && <p className="mt-1.5 text-xs text-destructive">{errors.circle_id.message}</p>}</div><Button type="submit" variant="outline" disabled={isAccepting} className="rounded-xl">{isAccepting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Accept invitation</Button></form></CardContent></Card><Alert className="border-amber-200/70 bg-amber-50/60 text-amber-950"><Search className="size-4" /><AlertTitle>Interim patient lookup</AlertTitle><AlertDescription className="text-amber-900/75">TODO: replace manual patient-ID entry and invitation paste with backend list endpoints for doctors.</AlertDescription></Alert></div></div>;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) { router.replace("/login"); return; }
    if (!user) fetchCurrentUser().catch((error) => { if (error?.response?.status === 403) setForbidden(true); });
  }, [fetchCurrentUser, router, user]);

  if (forbidden) return <main className="flex min-h-screen items-center justify-center px-6"><Alert className="max-w-lg border-amber-200 bg-amber-50"><AlertTitle>You don’t have access to this workspace</AlertTitle><AlertDescription>Your session is valid, but this account cannot access the requested area.</AlertDescription></Alert></main>;
  if (isLoading || !user) return <main className="min-h-screen"><div className="mx-auto max-w-7xl px-6 py-10 lg:px-10"><Skeleton className="h-10 w-44" /><div className="mt-12 grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div></div></main>;

  return <><DashboardHeader /><main className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Your workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Good to see you, {user.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-slate-600">{user.role === "patient" ? "Keep your care team aligned while staying in control of every permission." : "Find the patient record you have been invited to support."}</p></div><Badge variant="outline" className="w-fit capitalize">{user.role} account</Badge></div>{user.role === "patient" ? <PatientDashboard userId={user.id} /> : user.role === "doctor" ? <DoctorDashboard /> : <Card className="border-white/80 bg-white/80 shadow-sm"><CardContent className="flex flex-col items-center py-16 text-center"><FileText className="size-8 text-primary" /><h2 className="mt-5 text-2xl font-semibold text-slate-900">Caregiver workspace coming next</h2><p className="mt-3 max-w-md text-slate-600">Your account is ready. The caregiver-specific dashboard will be added alongside the shared timeline.</p></CardContent></Card>}</main></>;
}
