import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackToDashboardButton() {
  return (
    <Link href="/user" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 bg-background/45 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      返回仪表盘
    </Link>
  );
}
