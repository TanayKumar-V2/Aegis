"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/auth-errors";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(8, "Password must be at least 8 characters.") });
type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({ resolver: zodResolver(schema), mode: "onBlur" });

  async function onSubmit(values: LoginForm) {
    try { await login(values); toast.success("Welcome back to Aegis."); router.replace("/dashboard"); }
    catch (error) { toast.error(getApiErrorMessage(error, "We could not sign you in.")); }
  }

  return <AuthShell eyebrow="Welcome back" title="Care coordination, ready when you are." description="Sign in to see the care you have permission to access."><form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate><div><Label htmlFor="email">Email address</Label><div className="relative mt-2"><Mail className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11 pl-9" {...register("email")} /></div>{errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}</div><div><Label htmlFor="password">Password</Label><div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" placeholder="At least 8 characters" className="h-11 pl-9" {...register("password")} /></div>{errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>}</div><Button type="submit" disabled={isLoading} size="lg" className="mt-2 h-11 w-full rounded-xl">{isLoading ? <><Loader2 className="mr-2 size-4 animate-spin" />Signing in…</> : "Sign in"}</Button><p className="text-center text-sm text-slate-500">New to Aegis? <Link href="/register" className="font-semibold text-primary hover:underline">Create an account</Link></p></form></AuthShell>;
}
