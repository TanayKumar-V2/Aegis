"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, LockKeyhole, UserRound, Stethoscope } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({ name: z.string().min(1, "Enter your name."), email: z.string().email("Enter a valid email address."), password: z.string().min(8, "Password must be at least 8 characters."), role: z.enum(["patient", "doctor", "caregiver"]), specialty: z.string().optional() }).superRefine((data, ctx) => { if (data.role === "doctor" && !data.specialty?.trim()) ctx.addIssue({ code: "custom", path: ["specialty"], message: "Specialty is required for doctors." }); });
type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { control, register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({ resolver: zodResolver(schema), defaultValues: { role: "patient" }, mode: "onBlur" });
  const role = useWatch({ control, name: "role" });

  async function onSubmit(values: RegisterForm) {
    try { await registerUser({ ...values, specialty: values.role === "doctor" ? values.specialty : null }); toast.success("Account created. Sign in to continue."); router.replace("/login"); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not create your account.")); }
  }

  return <AuthShell eyebrow="Start with Aegis" title="Build a clearer circle of care." description="Create your account and bring the right people into the conversation—on your terms."><form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate><div><Label htmlFor="name">Full name</Label><div className="relative mt-2"><UserRound className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="name" placeholder="Maya Chen" className="h-11 pl-9" {...register("name")} /></div>{errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}</div><div><Label htmlFor="email">Email address</Label><div className="relative mt-2"><Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="email" type="email" placeholder="you@example.com" className="h-11 pl-9" {...register("email")} /></div>{errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}</div><div><Label htmlFor="password">Password</Label><div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="password" type="password" placeholder="At least 8 characters" className="h-11 pl-9" {...register("password")} /></div>{errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>}</div><div><Label>What best describes you?</Label><div className="mt-2 grid grid-cols-3 gap-2">{(["patient", "doctor", "caregiver"] as const).map((option) => <label key={option} className={`cursor-pointer rounded-xl border px-2 py-3 text-center text-xs font-semibold capitalize transition ${role === option ? "border-primary bg-primary/8 text-primary" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}><input type="radio" value={option} className="sr-only" {...register("role")} />{option}</label>)}</div>{errors.role && <p className="mt-1.5 text-xs text-destructive">{errors.role.message}</p>}</div>{role === "doctor" && <div><Label htmlFor="specialty">Specialty</Label><div className="relative mt-2"><Stethoscope className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="specialty" placeholder="Cardiology" className="h-11 pl-9" {...register("specialty")} /></div>{errors.specialty && <p className="mt-1.5 text-xs text-destructive">{errors.specialty.message}</p>}</div>}<Button type="submit" disabled={isLoading} size="lg" className="mt-2 h-11 w-full rounded-xl">{isLoading ? <><Loader2 className="mr-2 size-4 animate-spin" />Creating account…</> : "Create account"}</Button><p className="text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p></form></AuthShell>;
}
