import { Sparkles } from "lucide-react";
import { ServiceLink } from "@/components/dashboard/data-display";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

export function ServicesPanel({ user }: { user: UserProfile }) {
  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Services
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ServiceLink label="Video Server" href={user.server_video} />
        <ServiceLink label="Live Server" href={user.server_live} />
        <ServiceLink label="Music Server" href={user.server_music} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ServiceLink label="Telegram Group" href={user.telegram_group_url} />
        <ServiceLink label="Telegram Bind" href={user.telegram_bind_url} />
      </div>
    </GlassPanel>
  );
}
