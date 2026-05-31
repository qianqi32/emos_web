import { UserRound } from "lucide-react";
import { FieldRow } from "@/components/dashboard/data-display";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

export function UserProfilePanel({ user }: { user: UserProfile }) {
  const telegramStatus = user.telegram_bind_url && !user.telegram_user_id ? "未绑定" : "已绑定";

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <UserRound className="h-3.5 w-3.5" />
        User Profile
      </div>
      <div className="mt-4 grid gap-x-6 sm:grid-cols-2">
        <FieldRow label="User ID" value={user.user_id} />
        <FieldRow label="用户名" value={user.username} />
        <FieldRow label="笔名" value={user.pseudonym} />
        <FieldRow label="Telegram" value={telegramStatus} />
        <FieldRow label="Telegram ID" value={user.telegram_user_id} />
        <FieldRow label="Telegram Bind" value={user.telegram_bind_url ? "可绑定" : "已绑定"} />
        <FieldRow label="显示空媒体库" value={user.is_show_empty} />
        <FieldRow label="原图显示" value={user.is_original_image} />
        <FieldRow label="观影权限" value={user.is_viewing} />
        <FieldRow label="上传权限" value={user.is_can_upload} />
        <FieldRow label="下载权限" value={user.is_can_down} />
        <FieldRow label="EMPS" value={user.is_have_emps} />
      </div>
    </GlassPanel>
  );
}
