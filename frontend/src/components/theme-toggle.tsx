"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  if (!mounted) return <Button variant="ghost" size="icon" aria-label="Change theme" disabled />;

  const isDark = resolvedTheme === "dark";
  return <Button variant="ghost" size="icon" aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} title={isDark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setTheme(isDark ? "light" : "dark")}><Sun className={`size-4 transition-all ${isDark ? "rotate-0 scale-100" : "rotate-90 scale-0 dark:rotate-0 dark:scale-100"}`} /><Moon className={`absolute size-4 transition-all ${isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100 dark:-rotate-90 dark:scale-0"}`} /></Button>;
}
