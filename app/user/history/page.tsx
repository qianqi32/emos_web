"use client";

import { CheckCircle2, Film, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackToDashboardButton } from "@/components/dashboard/back-to-dashboard-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { changeRecord, getRecordList } from "@/lib/api/client";
import type { RecordListItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 20;

type RecordType = "all" | "movie" | "tv";

type PendingRecordAction = { item: RecordListItem; mode: "delete" | "complete" } | null;

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 分钟";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${minutes} 分钟`;
  return `${hours} 小时 ${rest} 分钟`;
}

function formatEpisode(item: RecordListItem) {
  if (item.video_type !== "tv") return "Movie";
  const season = String(item.season_number || 1).padStart(2, "0");
  const episode = String(item.episode_number || 1).padStart(3, "0");
  return `S${season}E${episode}`;
}

function recordKey(item: RecordListItem) {
  return `${item.video_id}-${item.media_id}-${item.season_number ?? "m"}-${item.episode_number ?? "m"}-${item.time}`;
}

export default function HistoryPage() {
  const { token } = useUserConsole();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [records, setRecords] = useState<RecordListItem[]>([]);
  const [recordType, setRecordType] = useState<RecordType>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingRecordAction>(null);
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadRecords = useCallback(async (mode: "reset" | "append" = "reset", page = 1) => {
    setStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setAction((current) => (mode === "append" ? "load-more" : current));
    setMessage("");

    try {
      const result = await getRecordList({ ...(recordType !== "all" ? { type: recordType } : {}), page, page_size: PAGE_SIZE }, token);
      const filteredItems = recordType === "all" ? result.items : result.items.filter((item) => item.video_type === recordType);
      setRecords((current) => {
        if (mode !== "append") return filteredItems;
        const existing = new Set(current.map(recordKey));
        return [...current, ...filteredItems.filter((item) => !existing.has(recordKey(item)))];
      });
      setTotal(result.total);
      setNextPage(page + 1);
      setHasMore(page * result.page_size < result.total);
      setStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setRecords([]);
        setTotal(0);
        setHasMore(false);
        setStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "观影历史加载失败");
    } finally {
      setAction((current) => (current === "load-more" ? "idle" : current));
    }
  }, [recordType, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords("reset", 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore || status !== "ready" || action !== "idle") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadRecords("append", nextPage);
    }, { rootMargin: "360px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [action, hasMore, loadRecords, nextPage, status]);

  function runAction(name: string, executor: () => Promise<string>) {
    void (async () => {
      setAction(name);
      setMessage("");
      try {
        const result = await executor();
        setMessage(result);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "操作失败");
      } finally {
        setAction("idle");
      }
    })();
  }

  function handleChangeRecord(item: RecordListItem, mode: "delete" | "complete") {
    setPendingAction({ item, mode });
  }

  function submitChangeRecord(item: RecordListItem, mode: "delete" | "complete") {
    const text = mode === "delete" ? "删除" : "标记完成";
    runAction(`${mode}-${recordKey(item)}`, async () => {
      await changeRecord({ mode, type: item.video_type, id: String(item.video_id) }, token);
      setPendingAction(null);
      await loadRecords("reset", 1);
      return `已${text}播放记录`;
    });
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Film className="h-3.5 w-3.5" />
          Watch History
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">观影历史</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">查看最近播放记录，支持电影/剧集筛选、标记完成与删除记录。接口仅返回回传超过 10 秒的视频。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BackToDashboardButton />
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              总计 <span className="font-mono text-foreground">{total}</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "全部"],
              ["movie", "电影"],
              ["tv", "剧集"]
            ] as [RecordType, string][]).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setRecordType(value)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${recordType === value ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void loadRecords("reset", 1)} disabled={status === "loading" || action !== "idle"} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />刷新
          </button>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="p-4 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载观影历史...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "观影历史加载失败"}</GlassPanel> : null}
      {status === "ready" && records.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无观影历史。</GlassPanel> : null}

      {status === "ready" && records.length > 0 ? (
        <div className="grid gap-3">
          {records.map((item) => (
            <GlassPanel key={recordKey(item)} className="overflow-hidden p-0">
              <div className="grid gap-0 md:grid-cols-[140px_minmax(0,1fr)]">
                <div className="min-h-40 bg-muted/30 md:min-h-full" style={item.video_image_backdrop || item.video_image_poster ? { backgroundImage: `url(${item.video_image_backdrop || item.video_image_poster})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} />
                <div className="min-w-0 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">{item.video_title}</h2>
                        <StatusBadge tone={item.video_type === "tv" ? "info" : "muted"}>{item.video_type === "tv" ? "剧集" : "电影"}</StatusBadge>
                        <StatusBadge tone={item.is_complete ? "success" : "warning"}>{item.is_complete ? "已播完" : "观看中"}</StatusBadge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatEpisode(item)}</span>
                        <span>{item.time}</span>
                        <span>已看 {formatDuration(item.play_seconds)}</span>
                        <span>总长 {formatDuration(item.media_seconds)}</span>
                      </div>
                      <p className="mt-2 truncate text-sm text-muted-foreground">{item.media_name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground/80">{item.play_ua}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!item.is_complete ? (
                        <button type="button" onClick={() => handleChangeRecord(item, "complete")} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-success/35 px-3 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" />完成
                        </button>
                      ) : null}
                      <button type="button" onClick={() => handleChangeRecord(item, "delete")} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-8" />
      {status === "ready" && hasMore ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{action === "load-more" ? "正在加载更多记录..." : `已加载 ${records.length} / ${total}，继续下拉加载更多`}</GlassPanel> : null}
      {status === "ready" && !hasMore && records.length > 0 ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {total} 条记录</GlassPanel> : null}
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction?.mode === "delete" ? "确认删除播放记录" : "确认标记完成"}
        description={
          pendingAction
            ? `将${pendingAction.mode === "delete" ? "删除" : "标记完成"}「${pendingAction.item.video_title}」的播放记录。`
            : undefined
        }
        confirmLabel={pendingAction?.mode === "delete" ? "删除记录" : "标记完成"}
        loading={action !== "idle" && action !== "load-more"}
        tone={pendingAction?.mode === "delete" ? "danger" : "default"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) {
            submitChangeRecord(pendingAction.item, pendingAction.mode);
          }
        }}
      />
    </div>
  );
}
