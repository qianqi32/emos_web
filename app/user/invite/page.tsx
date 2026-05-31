"use client";

import { Check, History, RefreshCw, RotateCcw, Send, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { getInviteHistory, getInviteInfo, inviteUser, revokeInvite } from "@/lib/api/client";
import type { InviteHistoryResponse, InviteInfoResponse } from "@/lib/api/invite";

const USER_ID_PATTERN = /^e.{8}s$/;

function pickString(value: unknown) {
  return typeof value === "string" && value ? value : "—";
}

function pickNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeHistory(payload: InviteHistoryResponse | null) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.list ?? payload.items ?? payload.data ?? [];
}

function historyTotal(payload: InviteHistoryResponse | null, listLength: number) {
  if (!payload || Array.isArray(payload)) {
    return listLength;
  }

  return typeof payload.total === "number" ? payload.total : listLength;
}

export default function InvitePage() {
  const { token, user } = useUserConsole();
  const [inviteInfo, setInviteInfo] = useState<InviteInfoResponse | null>(null);
  const [historyPayload, setHistoryPayload] = useState<InviteHistoryResponse | null>(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [action, setAction] = useState<"idle" | "inviting" | "refreshing">("idle");
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [message, setMessage] = useState("");

  const history = useMemo(() => normalizeHistory(historyPayload), [historyPayload]);
  const visibleHistory = historyExpanded ? history : history.slice(0, 4);
  const hiddenHistoryCount = Math.max(history.length - 4, 0);
  const total = historyTotal(historyPayload, history.length);
  const inviteRemaining = inviteInfo?.invite_remaining ?? user.invite_remaining;
  const inviteCount = pickNumber(inviteInfo?.invite_count, history.length);
  const canInvite = inviteRemaining > 0;

  async function loadInviteData(nextAction: "loading" | "refreshing" = "loading") {
    if (nextAction === "loading") {
      setStatus("loading");
    } else {
      setAction("refreshing");
    }

    setMessage("");

    try {
      const [info, historyResult] = await Promise.all([
        getInviteInfo(token),
        getInviteHistory({ page: 1, page_size: 20 }, token)
      ]);

      setInviteInfo(info);
      setHistoryPayload(historyResult);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "邀请数据加载失败");
    } finally {
      setAction("idle");
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialInviteData() {
      try {
        const [info, historyResult] = await Promise.all([
          getInviteInfo(token),
          getInviteHistory({ page: 1, page_size: 20 }, token)
        ]);

        if (!isMounted) {
          return;
        }

        setInviteInfo(info);
        setHistoryPayload(historyResult);
        setStatus("idle");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(error instanceof Error ? error.message : "邀请数据加载失败");
      }
    }

    loadInitialInviteData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleInvite() {
    const nextUserId = inviteUserId.trim();

    if (!nextUserId) {
      setMessage("请输入用户 ID");
      return;
    }

    if (!USER_ID_PATTERN.test(nextUserId)) {
      setMessage("用户 ID 格式不正确，应为 10 位字符串，以 e 开头、s 结尾");
      return;
    }

    setAction("inviting");
    setMessage("");

    try {
      await inviteUser({ invite_user_id: nextUserId }, token);
      setInviteUserId("");
      setMessage("邀请成功");
      await loadInviteData("refreshing");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邀请失败");
      setAction("idle");
    }
  }

  async function handleRevoke(userId: string) {
    if (!userId || userId === "—") {
      return;
    }

    setRevokingUserId(userId);
    setMessage("");

    try {
      await revokeInvite({ user_id: userId }, token);
      setMessage("撤销邀请成功");
      await loadInviteData("refreshing");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "撤销邀请失败");
    } finally {
      setRevokingUserId(null);
    }
  }

  if (status === "loading") {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              <UsersRound className="h-3.5 w-3.5" />
              Invite Center
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">邀请用户</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">查看邀请额度、邀请关系与最近邀请历史。输入对方用户 ID 后即可消耗一次邀请额度完成邀请。</p>
          </div>
          <button type="button" onClick={() => loadInviteData("refreshing")} disabled={action !== "idle"} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={action === "refreshing" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            刷新
          </button>
        </div>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        <MetricCard label="Remaining" value={String(inviteRemaining)} helper="剩余邀请次数" />
        <MetricCard label="Invited" value={String(inviteCount)} helper="已邀请用户数" />
        <MetricCard label="History" value={String(total)} helper="邀请历史记录" />
        <MetricCard label="Parent" value={pickString(inviteInfo?.parent?.user_id)} helper="邀请人用户 ID" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] xl:gap-5">
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Send className="h-3.5 w-3.5" />
                Invite User
              </div>
              <h2 className="mt-3 text-lg font-bold tracking-tight">邀请好友</h2>
            </div>
            <StatusBadge tone={canInvite ? "success" : "warning"}>{canInvite ? "Available" : "No Quota"}</StatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="invite-user-id">用户 ID</label>
            <input id="invite-user-id" value={inviteUserId} onChange={(event) => setInviteUserId(event.target.value)} placeholder="例如：e12345678s" disabled={!canInvite || action === "inviting"} className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-50" />
            <p className="text-xs leading-5 text-muted-foreground">用户 ID 应为 10 位字符串，以 e 开头、s 结尾。</p>
          </div>

          <button type="button" onClick={handleInvite} disabled={!canInvite || action === "inviting"} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {action === "inviting" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            确定邀请
          </button>

          {message ? <div className={message === "邀请成功" || message === "撤销邀请成功" ? "mt-4 rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success" : "mt-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning"}>{message}</div> : null}
        </GlassPanel>

        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Invite History
              </div>
              <h2 className="mt-3 text-lg font-bold tracking-tight">邀请历史</h2>
            </div>
            <StatusBadge tone="muted">{total} Records</StatusBadge>
          </div>

          <div className="mt-5 space-y-3">
            {history.length ? visibleHistory.map((item, index) => {
              const target = pickString(item.invite_user_id ?? item.user_id);
              const name = pickString(item.username ?? item.pseudonym);
              const telegramUserId = pickString(item.telegram_user_id);
              const time = pickString(item.invite_at ?? item.created_at ?? item.updated_at);
              const isRevoking = revokingUserId === target;

              return (
                <div key={String(item.id ?? `${target}-${index}`)} className="grid gap-3 rounded-2xl border border-border/50 bg-muted/15 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{name}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                      <span>ID: {target}</span>
                      <span>TG: {telegramUserId}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="font-mono text-xs text-muted-foreground">{time}</div>
                    <button type="button" onClick={() => handleRevoke(target)} disabled={isRevoking || action !== "idle" || target === "—"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-danger/25 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
                      {isRevoking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      撤销
                    </button>
                  </div>
                </div>
              );
            }) : <EmptyState title="暂无邀请历史" description={status === "error" ? message || "邀请历史加载失败" : "完成邀请后，记录会显示在这里。"} />}
            {hiddenHistoryCount ? (
              <button type="button" onClick={() => setHistoryExpanded((value) => !value)} className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border/70 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                {historyExpanded ? "收起邀请历史" : `展开其余 ${hiddenHistoryCount} 条邀请历史`}
              </button>
            ) : null}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
