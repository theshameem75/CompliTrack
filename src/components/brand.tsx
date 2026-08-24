import { ShieldCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><ShieldCheck className="h-5 w-5" /></span>
      {!compact && <span className="text-lg font-semibold tracking-tight">Compli<span className="text-primary">Track</span></span>}
    </div>
  );
}
