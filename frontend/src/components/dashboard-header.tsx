"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Stethoscope } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { ThemeToggle } from "@/components/theme-toggle";

export function DashboardHeader() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function signOut() {
    logout();
    router.replace("/");
  }

  const initials = user?.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AG";

  return <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10"><Link href="/dashboard" className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Stethoscope className="size-5" /></span><span className="text-xl font-semibold tracking-tight text-slate-800">aegis</span></Link><div className="flex items-center gap-2"><ThemeToggle /><div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.name || "Loading session"}</p><p className="text-xs capitalize text-slate-500">{user?.role || ""}</p></div><Separator orientation="vertical" className="hidden h-8 sm:block" /><Avatar className="size-9"><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar><Button variant="ghost" size="icon" aria-label="Log out" onClick={signOut}><LogOut className="size-4" /></Button></div></div></header>;
}
