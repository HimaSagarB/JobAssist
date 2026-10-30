import { cn } from "@/lib/cn";

/** JobAssist's briefcase and check mark. Decorative when next to the name. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <g fill="none" className="stroke-on-primary" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="14" y="23" width="36" height="27" rx="5" />
        <path d="M25 23v-5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5M24 36l6 6 11-12" />
      </g>
    </svg>
  );
}
