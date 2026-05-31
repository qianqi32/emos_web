import { UserRound } from "lucide-react";
import { AccountActionsPanel } from "@/components/dashboard/account-actions-panel";
import { DeviceSessionPanel } from "@/components/dashboard/device-session-panel";
import { UserProfilePanel } from "@/components/dashboard/user-profile-panel";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { UserProfile } from "@/lib/api/types";

interface UserPageProps {
  token: string;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

export function UserPage({ token, user, onUserChange }: UserPageProps) {
  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
          User Center
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">用户信息</h1>
        <p className="mt-2 text-sm text-muted-foreground">管理基础资料、登录密码、Telegram 状态与账号权限。</p>
      </GlassPanel>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr] xl:gap-5">
        <UserProfilePanel user={user} />
        <AccountActionsPanel token={token} user={user} onUserChange={onUserChange} />
      </div>
      <DeviceSessionPanel token={token} />
    </div>
  );
}
