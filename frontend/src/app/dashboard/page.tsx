"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, ArrowRight, Check, ClipboardList, FileText, Link2, Loader2, Plus, ShieldAlert, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "@/components/dashboard-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";
import type { CareCircle, DoctorPatient, PatientCareCircle, PermissionScope } from "@/types/care";

const inviteSchema = z.object({ doctor_email: z.string().email("Enter a valid doctor email."), permission_scope: z.enum(["full", "notes_only", "prescriptions_only"]) });
type InviteForm = z.infer<typeof inviteSchema>;

const scopeLabels: Record<PermissionScope, string> = { full: "Full access", notes_only: "Notes only", prescriptions_only: "Prescriptions only" };

function AccessBadge({ status, scope }: { status: CareCircle["status"]; scope: PermissionScope }) {
  return <div className="flex items-center gap-2"><Badge variant={status === "active" ? "secondary" : status === "pending" ? "outline" : "destructive"} className="capitalize">{status}</Badge><span className="text-xs text-slate-500">{scopeLabels[scope]}</span></div>;
}

function PatientDashboard({ userId }: { userId: string }) {
  const [circles, setCircles] = useState<PatientCareCircle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [updatingCircleId, setUpdatingCircleId] = useState<string | null>(null);
  const [circleToRevoke, setCircleToRevoke] = useState<PatientCareCircle | null>(null);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema), defaultValues: { permission_scope: "full" } });

  const fetchCareCircle = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<PatientCareCircle[]>(`/patients/${userId}/care-circle`);
      setCircles(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We could not load your care circle."));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchCareCircle(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchCareCircle]);

  async function inviteDoctor(values: InviteForm) {
    setIsInviting(true);
    try {
      await api.post<CareCircle>(`/patients/${userId}/invite-doctor`, values);
      toast.success("Doctor invited to your care circle.");
      await fetchCareCircle();
    } catch (error) { toast.error(getApiErrorMessage(error, "We could not send that invitation.")); }
    finally { setIsInviting(false); }
  }

  async function updateScope(circleId: string, permissionScope: PermissionScope) {
    setUpdatingCircleId(circleId);
    try {
      await api.patch(`/patients/care-circles/${circleId}/permissions`, { permission_scope: permissionScope });
      toast.success("Access scope updated.");
      await fetchCareCircle();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We could not update that access scope."));
    } finally {
      setUpdatingCircleId(null);
    }
  }

  async function revokeAccess() {
    if (!circleToRevoke) return;
    setUpdatingCircleId(circleToRevoke.circle_id);
    try {
      await api.patch(`/patients/care-circles/${circleToRevoke.circle_id}/permissions`, { status: "revoked" });
      toast.success("Doctor access revoked.");
      setCircleToRevoke(null);
      await fetchCareCircle();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We could not revoke that access."));
    } finally {
      setUpdatingCircleId(null);
    }
  }

  return <>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>Bring your care team together</CardTitle><CardDescription className="mt-2">Invite a doctor and choose exactly how much of your record they can access.</CardDescription></div><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UsersRound className="size-5" /></span></div></CardHeader><CardContent><form onSubmit={handleSubmit(inviteDoctor)} className="space-y-4" noValidate><div><Label htmlFor="doctor_email">Doctor email</Label><Input id="doctor_email" type="email" placeholder="doctor@clinic.com" className="mt-2 h-11" {...register("doctor_email")} />{errors.doctor_email && <p className="mt-1.5 text-xs text-destructive">{errors.doctor_email.message}</p>}</div><div><Label htmlFor="permission_scope">Access scope</Label><Select defaultValue="full" onValueChange={(value) => setValue("permission_scope", value as InviteForm["permission_scope"], { shouldValidate: true })}><SelectTrigger id="permission_scope" className="mt-2 h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full access</SelectItem><SelectItem value="notes_only">Notes only</SelectItem><SelectItem value="prescriptions_only">Prescriptions only</SelectItem></SelectContent></Select></div><Button type="submit" disabled={isInviting} className="rounded-xl">{isInviting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}Invite doctor</Button></form></CardContent></Card>
        <Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><CardTitle>Care circle</CardTitle><CardDescription className="mt-2">Manage the doctors who can access your record.</CardDescription></CardHeader><CardContent>{isLoading ? <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div> : circles.length === 0 ? <EmptyState icon={UsersRound} message={"You haven't added any doctors yet — invite one below"} /> : <div className="space-y-3">{circles.map((circle) => <div key={circle.circle_id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{circle.doctor_name}</p><p className="mt-1 truncate text-xs text-slate-600">{circle.doctor_specialty ?? circle.doctor_email}</p><p className="mt-1 truncate text-xs text-slate-500">{circle.doctor_email}</p></div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{circle.status === "active" ? <><Badge variant="secondary" className="capitalize">{circle.status}</Badge><Select value={circle.permission_scope} onValueChange={(value) => { if (value) void updateScope(circle.circle_id, value as PermissionScope); }} disabled={updatingCircleId === circle.circle_id}><SelectTrigger className="h-9 w-40 rounded-xl text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full">Full access</SelectItem><SelectItem value="notes_only">Notes only</SelectItem><SelectItem value="prescriptions_only">Prescriptions only</SelectItem></SelectContent></Select><Button type="button" variant="outline" size="sm" disabled={updatingCircleId === circle.circle_id} onClick={() => setCircleToRevoke(circle)} className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800">Revoke</Button></> : <AccessBadge status={circle.status} scope={circle.permission_scope} />}</div></div>)}</div>}</CardContent></Card>
      </div>
      <div className="space-y-6"><Card className="border-primary/15 bg-primary/5 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Your control center</CardTitle><CardDescription className="mt-2 text-slate-700">You own the access decisions. Changes are recorded in your audit trail.</CardDescription></CardHeader><CardContent className="space-y-3"><Link href={`/patients/${userId}/timeline`} className="flex items-center justify-between rounded-xl bg-white/75 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-primary"><span className="flex items-center gap-3"><Activity className="size-4 text-primary" />Open my timeline</span><ArrowRight className="size-4" /></Link><Link href={`/patients/${userId}/audit-log`} className="flex items-center justify-between rounded-xl bg-white/75 p-4 text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-primary"><span className="flex items-center gap-3"><ClipboardList className="size-4 text-primary" />Review audit log</span><ArrowRight className="size-4" /></Link></CardContent></Card><Alert className="border-emerald-200/70 bg-emerald-50/60 text-emerald-950"><Check className="size-4" /><AlertTitle>Patient-owned by design</AlertTitle><AlertDescription className="text-emerald-900/75">Access can be narrowed or revoked whenever your care needs change.</AlertDescription></Alert></div>
    </div>
    <Dialog open={Boolean(circleToRevoke)} onOpenChange={(open) => { if (!open && !updatingCircleId) setCircleToRevoke(null); }}><DialogContent><DialogHeader><DialogTitle>Revoke doctor access?</DialogTitle><DialogDescription>This will stop {circleToRevoke?.doctor_name ?? "this doctor"} from accessing your records. You can invite them again later if needed.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" disabled={Boolean(updatingCircleId)} />}>Cancel</DialogClose><Button type="button" variant="destructive" disabled={Boolean(updatingCircleId)} onClick={() => void revokeAccess()}>{updatingCircleId ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldAlert className="mr-2 size-4" />}Revoke access</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function DoctorDashboard() {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingCircleId, setAcceptingCircleId] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<DoctorPatient[]>("/doctors/me/patients");
      setPatients(data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We could not load your patient list."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchPatients(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchPatients]);

  async function acceptInvite(circleId: string) {
    setAcceptingCircleId(circleId);
    try {
      await api.post(`/patients/care-circles/${circleId}/accept`);
      toast.success("Care-circle invitation accepted.");
      await fetchPatients();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We could not accept that invitation."));
    } finally {
      setAcceptingCircleId(null);
    }
  }

  return <Card className="border-white/80 bg-white/80 shadow-sm"><CardHeader><CardTitle>My patients</CardTitle><CardDescription className="mt-2">Patients who have invited you to their care circle.</CardDescription></CardHeader><CardContent>{isLoading ? <div className="space-y-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div> : patients.length === 0 ? <EmptyState icon={UsersRound} message={"You don't have any patients yet — ask a patient to invite you by email"} /> : <div className="space-y-3">{patients.map((patient) => <div key={patient.circle_id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><UserRound className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{patient.patient_name}</p><p className="mt-1 truncate text-xs text-slate-600">{patient.patient_email}</p></div><AccessBadge status={patient.status} scope={patient.permission_scope} /><div className="flex shrink-0 items-center gap-2">{patient.status === "pending" ? <Button type="button" variant="outline" size="sm" disabled={acceptingCircleId === patient.circle_id} onClick={() => void acceptInvite(patient.circle_id)} className="rounded-xl">{acceptingCircleId === patient.circle_id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}Accept invite</Button> : patient.status === "active" ? <Link href={`/patients/${patient.patient_id}/timeline`} className="inline-flex h-9 items-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/85">Open timeline<ArrowRight className="ml-2 size-3.5" /></Link> : null}</div></div>)}</div>}</CardContent></Card>;
}

function CaregiverDashboard() {
  const [patientId, setPatientId] = useState("");
  const trimmedPatientId = patientId.trim();

  // TODO: replace this lookup with a caregiver patient-list endpoint once one exists.
  return <Card className="max-w-2xl border-white/80 bg-white/80 shadow-sm"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle>View a patient timeline</CardTitle><CardDescription className="mt-2">Enter a patient ID you have caregiver access to. This temporary lookup will be replaced with a patient list.</CardDescription></div><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="size-5" /></span></div></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="caregiver_patient_id">Enter a patient ID you have caregiver access to</Label><Input id="caregiver_patient_id" value={patientId} onChange={(event) => setPatientId(event.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-2 h-11" /></div><Link href={trimmedPatientId ? `/patients/${trimmedPatientId}/timeline` : "#"} aria-disabled={!trimmedPatientId} onClick={(event) => { if (!trimmedPatientId) event.preventDefault(); }} className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium text-primary-foreground transition ${trimmedPatientId ? "bg-primary hover:bg-primary/85" : "cursor-not-allowed bg-slate-300"}`}><Link2 className="mr-2 size-4" />View timeline<ArrowRight className="ml-2 size-4" /></Link><p className="text-xs leading-5 text-slate-500">Caregiver patient lists are not available yet, so use the ID shared by the patient or care team.</p></CardContent></Card>;
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

  return <><DashboardHeader /><main className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-10"><div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Your workspace</p><h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Good to see you, {user.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-slate-600">{user.role === "patient" ? "Keep your care team aligned while staying in control of every permission." : user.role === "doctor" ? "Find the patient record you have been invited to support." : "Open a patient timeline with the access they have shared with you."}</p></div><Badge variant="outline" className="w-fit capitalize">{user.role} account</Badge></div>{user.role === "patient" ? <PatientDashboard userId={user.id} /> : user.role === "doctor" ? <DoctorDashboard /> : <CaregiverDashboard />}</main></>;
}
