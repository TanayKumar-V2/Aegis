import { cn } from "@/lib/utils";

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span aria-label="Aegis" className={cn("font-brand text-[1.8rem] font-black uppercase leading-none tracking-[-0.085em]", className)}>
      <span className="text-foreground dark:text-white">AE</span>
      <span className="text-primary">GIS</span>
    </span>
  );
}
