import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export function CornerPlus({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("pointer-events-none absolute text-border", className)}
      {...props}
    >
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
