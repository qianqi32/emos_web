"use client";

import { Ban, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { changeBanStatus, getBanList } from "@/lib/api/client";
import type { BanListItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type BanActionType = "disable" | "unblock";

type PendingBanAction = {
  type: BanActionType;
  userId: string;
  reason: string;
} | null;

const actionLabels: Record<BanActionType, string> = {
  disable: "封禁",
  unblock: "解封"
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").slice(0, 16);
}

function itemTitle(item: BanListItem) {
  return item.username?.trim() || item.user_id;
}

export function BanPanel() {
  const { token, user } = useUserConsole();
  const isAdmin = user.roles?.includes("admin");
  const [items, setItems] = useState<BanListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<BanActionType>("disable");
  const [pendingAction, setPendingAction] = useState<PendingBanAction>(null);
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");

  const blockedCount = useMemo(() => items.length, [items]);

  const loadItems = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const result = await getBanList(token);
      setItems(result);
      setStatus("ready");
    } catch (error) {
      setItems([]);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "封禁列表加载失败");
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadItems();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadItems]);

  function prepareAction(type: BanActionType, userId = targetUserId, actionReason = reason) {
    const nextUserId = userId.trim();
    const nextReason = actionReason.trim();

    if (!isAdmin) {
      setMessage("只有管理员才能执行封禁操作");
      return;
    }

    if (!nextUserId) {
      setMessage("请输入用户 ID");
      return;
    }

    if (!nextReason) {
      setMessage(`请输入${actionLabels[type]}原因`);
      return;
    }

    setPendingAction({ type, userId: nextUserId, reason: nextReason });
    setDialogError("");
  }

  async function submitAction(pending: NonNullable<PendingBanAction>) {
    setAction(`${pending.type}-${pending.userId}`);
    setMessage("");
    setDialogError("");

    try {
      const result = await changeBanStatus(
        {
          type: pending.type,
          user_id: pending.userId,
          reason: pending.reason
        },
        token
      );
      setPendingAction(null);
      setTargetUserId("");
      setReason("");
      await loadItems();
      setMessage(result.carrot !== undefined ? `${actionLabels[pending.type]}成功，萝卜变化：${result.carrot}` : `${actionLabels[pending.type]}成功`);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : `${actionLabels[pending.type]}失败`);
    } finally {
      setAction("idle");
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={status === "error" ? "" : message} tone="success" onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" />
          Ban Management
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">封禁管理</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">查看最近封禁记录。管理员可以封禁或解封用户，并填写操作原因。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:items-center">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">封禁记录 <span className="font-mono text-foreground">{blockedCount}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">权限 <span className="font-mono text-foreground">{isAdmin ? "Admin" : "User"}</span></div>
            <button type="button" onClick={() => void loadItems()} disabled={status === "loading" || action !== "idle"} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1">
              <RefreshCw className="h-4 w-4" />
              刷新列表
            </button>
          </div>
        </div>
      </GlassPanel>

      {isAdmin ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ban className="h-4 w-4 text-muted-foreground" />
            封禁操作
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select value={actionType} onChange={(event) => setActionType(event.target.value as BanActionType)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
              <option value="disable">封禁用户</option>
              <option value="unblock">解封用户</option>
            </select>
            <input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="用户 ID" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="操作原因" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <button type="button" onClick={() => prepareAction(actionType)} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">提交操作</button>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel className="p-5 text-sm leading-6 text-muted-foreground">当前账号不是管理员，只能查看封禁列表，无法执行封禁或解封操作。</GlassPanel>
      )}

      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载封禁列表...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "封禁列表加载失败"}</GlassPanel> : null}
      {status === "ready" && items.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">当前没有封禁记录。</GlassPanel> : null}

      {status === "ready" && items.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <GlassPanel key={`${item.user_id}-${item.created_at ?? "unknown"}`} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{itemTitle(item)}</h2>
                    <span className="rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 text-[10px] font-semibold text-danger">已封禁</span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-muted-foreground">ID {item.user_id}</div>
                  <div className="mt-1 text-xs text-muted-foreground">TG {item.telegram_user_id ?? "-"} · {formatDate(item.created_at)}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.disable_reason || "未提供原因"}</p>
                </div>
                {isAdmin ? (
                  <button type="button" onClick={() => prepareAction("unblock", item.user_id, `解除封禁：${item.disable_reason || item.username || item.user_id}`)} disabled={action !== "idle"} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-success/35 px-3 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    解封
                  </button>
                ) : null}
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? `确认${actionLabels[pendingAction.type]}用户` : "确认操作"}
        description={pendingAction ? `用户 ID：${pendingAction.userId}。原因：${pendingAction.reason}` : undefined}
        confirmLabel={pendingAction ? actionLabels[pendingAction.type] : "确认"}
        loading={action !== "idle"}
        tone={pendingAction?.type === "disable" ? "danger" : "default"}
        error={dialogError}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) {
            void submitAction(pendingAction);
          }
        }}
      />
    </div>
  );
}

export default BanPanel;
