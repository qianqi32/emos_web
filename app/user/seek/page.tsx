"use client";

import { Clock, HandHeart, History, RefreshCw, Search, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { applySeek, claimSeek, getSeekHistory, getSeekList, querySeek, urgeSeek } from "@/lib/api/client";
import type { SeekHistoryItem, SeekListItem, SeekQueryResponse } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 20;
const ALL_STATUSES = ["default", "upload", "complete", "cancel", "forget"];

type SeekStatusFilter = "active" | "default" | "upload" | "complete" | "cancel" | "forget" | "all";
type SeekTypeFilter = "" | "movie" | "tv";

const STATUS_OPTIONS: { value: SeekStatusFilter; label: string }[] = [
  { value: "active", label: "进行中" },
  { value: "default", label: "待认领" },
  { value: "upload", label: "已认领" },
  { value: "complete", label: "已完成" },
  { value: "cancel", label: "已取消" },
  { value: "forget", label: "已遗忘" },
  { value: "all", label: "全部" }
];

const SORT_OPTIONS = [
  { value: "count_request", label: "求片数" },
  { value: "seek_carrot", label: "萝卜数" },
  { value: "upload_expired_at", label: "认领过期" },
  { value: "updated_at", label: "更新时间" }
];

const STATUS_LABELS: Record<string, string> = {
  default: "待认领",
  upload: "已认领",
  complete: "已完成",
  cancel: "已取消",
  forget: "已遗忘"
};

function statusList(status: SeekStatusFilter) {
  if (status === "active") {
    return ["default", "upload"];
  }

  if (status === "all") {
    return ALL_STATUSES;
  }

  return [status];
}

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function parseSeekItemId(itemId: string) {
  const [itemType, ...rest] = itemId.split("-");
  const itemIdValue = rest.join("-");

  if (!itemType || !itemIdValue) {
    return null;
  }

  return { item_type: itemType, item_id: itemIdValue };
}

function canCancelClaim(item: SeekListItem, username: string) {
  return item.status === "upload" && item.upload_username === username;
}

export default function SeekPage() {
  const { token, user } = useUserConsole();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<SeekListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [action, setAction] = useState("idle");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [videoType, setVideoType] = useState<SeekTypeFilter>("");
  const [seekStatus, setSeekStatus] = useState<SeekStatusFilter>("active");
  const [sortBy, setSortBy] = useState("count_request");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [uploadSelf, setUploadSelf] = useState(false);
  const [detailItem, setDetailItem] = useState<SeekListItem | null>(null);
  const [detail, setDetail] = useState<SeekQueryResponse | null>(null);
  const [historyItem, setHistoryItem] = useState<SeekListItem | null>(null);
  const [history, setHistory] = useState<SeekHistoryItem[]>([]);

  const stats = useMemo(() => ({
    active: items.filter((item) => item.status === "default" || item.status === "upload").length,
    request: items.reduce((sum, item) => sum + item.count_request, 0),
    carrot: items.reduce((sum, item) => sum + item.seek_carrot, 0)
  }), [items]);

  const loadSeeks = useCallback(async (mode: "reset" | "append" = "reset", pageToLoad = 1) => {
    setStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setLoadingMore(mode === "append");
    setMessage("");

    try {
      const result = await getSeekList({
        page: pageToLoad,
        page_size: PAGE_SIZE,
        video_type: videoType || null,
        sort_by: sortBy,
        sort_order: sortOrder,
        status: statusList(seekStatus),
        upload_self: uploadSelf,
        video_title: appliedSearch || null,
        with_user: true
      }, token);

      setItems((current) => {
        if (mode !== "append") {
          return result.items;
        }

        const existingIds = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !existingIds.has(item.id))];
      });
      setTotal(result.total);
      setNextPage(pageToLoad + 1);
      setHasMore(pageToLoad * result.page_size < result.total);
      setStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "求片列表加载失败");
    } finally {
      setLoadingMore(false);
    }
  }, [appliedSearch, seekStatus, sortBy, sortOrder, token, uploadSelf, videoType]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSeeks("reset", 1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSeeks]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasMore || status !== "ready" || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void loadSeeks("append", nextPage);
      }
    }, { rootMargin: "420px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadSeeks, loadingMore, nextPage, status]);

  function runAction(actionName: string, executor: () => Promise<string>) {
    void (async () => {
      setAction(actionName);
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

  function handleSearch() {
    setAppliedSearch(search.trim());
  }

  function handleReset() {
    setSearch("");
    setAppliedSearch("");
    setVideoType("");
    setSeekStatus("active");
    setSortBy("count_request");
    setSortOrder("desc");
    setUploadSelf(false);
  }

  function handleApply(item: SeekListItem) {
    const parsed = parseSeekItemId(item.item_id);

    if (!parsed) {
      setMessage("无法解析求片项目 ID");
      return;
    }

    runAction(`apply-${item.id}`, async () => {
      const result = await applySeek(parsed, token);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, seek_is_request: result.seek_is_request } : entry));
      await loadSeeks("reset", 1);
      return result.seek_is_request ? "求片成功" : "已取消求片";
    });
  }

  function handleClaim(item: SeekListItem, type: "confirm" | "cancel") {
    if (type === "cancel" && !window.confirm(`确认取消认领「${item.video_title_display}」？`)) {
      return;
    }

    runAction(`claim-${item.id}`, async () => {
      await claimSeek({ seek_id: item.id, type }, token);
      await loadSeeks("reset", 1);
      return type === "confirm" ? "认领成功" : "已取消认领";
    });
  }

  function handleUrge(item: SeekListItem) {
    const value = window.prompt(`请输入催上片萝卜数量，范围 1 到 5000。当前总悬赏 ${item.seek_carrot} 萝卜`, "10");

    if (value === null) {
      return;
    }

    const carrot = Number(value);
    if (!Number.isInteger(carrot) || carrot < 1 || carrot > 5000) {
      setMessage("催上片萝卜数量必须是 1 到 5000 的整数");
      return;
    }

    if (!window.confirm(`确认为「${item.video_title_display}」追加 ${carrot} 萝卜悬赏？`)) {
      return;
    }

    runAction(`urge-${item.id}`, async () => {
      const result = await urgeSeek({ seek_id: item.id, carrot }, token);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, seek_carrot: result.seek_carrot } : entry));
      await loadSeeks("reset", 1);
      return `催上片成功，总悬赏 ${result.seek_carrot} 萝卜`;
    });
  }

  function handleDetail(item: SeekListItem) {
    setDetailItem(item);
    setDetail(null);
    runAction(`detail-${item.id}`, async () => {
      const result = await querySeek({ seek_id: String(item.id) }, token);
      setDetail(result);
      return "详情已加载";
    });
  }

  function handleHistory(item: SeekListItem) {
    setHistoryItem(item);
    setHistory([]);
    runAction(`history-${item.id}`, async () => {
      const result = await getSeekHistory({ seek_id: String(item.id) }, token);
      setHistory(result);
      return "历史已加载";
    });
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <HandHeart className="h-3.5 w-3.5" />
          Seek
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">求片管理</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">查看用户求片需求，支持求片、认领、取消认领、催上片和历史查询。</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm lg:flex">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">已加载 <span className="font-mono text-foreground">{items.length}</span> / <span className="font-mono text-foreground">{total}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">进行中 <span className="font-mono text-foreground">{stats.active}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">悬赏 <span className="font-mono text-foreground">{stats.carrot}</span></div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { handleSearch(); } }} placeholder="按标题搜索" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          <select value={videoType} onChange={(event) => setVideoType(event.target.value as SeekTypeFilter)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            <option value="">全部类型</option>
            <option value="movie">电影</option>
            <option value="tv">剧集</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
          <button type="button" onClick={handleSearch} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
            <Search className="h-4 w-4" />
            搜索
          </button>
          <button type="button" onClick={handleReset} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40">
            <X className="h-4 w-4" />
            重置
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button key={option.value} type="button" onClick={() => setSeekStatus(option.value)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${seekStatus === option.value ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}>
              {option.label}
            </button>
          ))}
          <button type="button" onClick={() => setUploadSelf((current) => !current)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${uploadSelf ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}>只看我认领</button>
          <button type="button" onClick={() => void loadSeeks("reset", 1)} disabled={status === "loading" || action !== "idle"} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="p-4 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载求片列表...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "求片列表加载失败"}</GlassPanel> : null}
      {status === "ready" && items.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">当前筛选下暂无求片。</GlassPanel> : null}

      {status === "ready" && items.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <GlassPanel key={item.id} className="overflow-hidden p-0">
              <div className="grid gap-0 md:grid-cols-[132px_minmax(0,1fr)]">
                <div className="min-h-36 bg-muted/30 md:min-h-full" style={item.video_image_poster ? { backgroundImage: `url(${item.video_image_poster})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} role={item.video_image_poster ? "img" : undefined} aria-label={item.video_image_poster ? item.video_title_display : undefined} />
                <div className="min-w-0 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">{item.video_title_display}</h2>
                        <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{item.video_type === "movie" ? "电影" : "剧集"}</span>
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">{STATUS_LABELS[item.status] || item.status}</span>
                        {item.seek_is_request ? <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">已求片</span> : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">认领人：{textValue(item.upload_username, "暂无")}</p>
                    </div>
                    <button type="button" onClick={() => handleApply(item)} disabled={action !== "idle"} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">{item.seek_is_request ? "取消求片" : "求片"}</button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <div>求片 <span className="font-mono text-foreground">{item.count_request}</span></div>
                    <div>萝卜 <span className="font-mono text-foreground">{item.seek_carrot}</span></div>
                    <div>季 <span className="font-mono text-foreground">{textValue(item.video_season_number)}</span></div>
                    <div>集 <span className="font-mono text-foreground">{textValue(item.video_episode_number)}</span></div>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="inline-flex items-center gap-2"><Clock className="h-3.5 w-3.5" />更新 {formatDateTime(item.updated_at)}</div>
                    <div className="inline-flex items-center gap-2"><UploadCloud className="h-3.5 w-3.5" />过期 {formatDateTime(item.upload_expired_at)}</div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleDetail(item)} disabled={action !== "idle"} className="rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">详情</button>
                    <button type="button" onClick={() => handleHistory(item)} disabled={action !== "idle"} className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"><History className="h-3.5 w-3.5" />历史</button>
                    <button type="button" onClick={() => handleUrge(item)} disabled={action !== "idle"} className="rounded-full border border-warning/35 px-3 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50">催上片</button>
                    {item.is_can_claim && item.status !== "upload" ? <button type="button" onClick={() => handleClaim(item, "confirm")} disabled={action !== "idle"} className="rounded-full border border-success/35 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50">认领</button> : null}
                    {canCancelClaim(item, user.username) ? <button type="button" onClick={() => handleClaim(item, "cancel")} disabled={action !== "idle"} className="rounded-full border border-danger/35 px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">取消认领</button> : null}
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-8" />
      {status === "ready" && hasMore ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{loadingMore ? "正在加载更多求片..." : `已加载 ${items.length} / ${total}，继续下拉加载更多`}</GlassPanel> : null}
      {status === "ready" && !hasMore && items.length > 0 ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {total} 条求片</GlassPanel> : null}

      {detailItem ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Detail</div>
              <h2 className="mt-2 text-lg font-semibold">{detailItem.video_title_display}</h2>
            </div>
            <button type="button" onClick={() => { setDetailItem(null); setDetail(null); }} className="rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/40">关闭</button>
          </div>
          {detail ? (
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">状态 <div className="mt-1 font-mono text-foreground">{STATUS_LABELS[detail.status] || detail.status}</div></div>
              <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">求片数 <div className="mt-1 font-mono text-foreground">{textValue(detail.request_count, "0")}</div></div>
              <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">悬赏 <div className="mt-1 font-mono text-foreground">{textValue(detail.seek_carrot, "0")}</div></div>
              <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">认领人 <div className="mt-1 font-mono text-foreground">{textValue(detail.upload_username, "暂无")}</div></div>
            </div>
          ) : <div className="mt-4 text-sm text-muted-foreground">正在加载详情...</div>}
        </GlassPanel>
      ) : null}

      {historyItem ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">History</div>
              <h2 className="mt-2 text-lg font-semibold">{historyItem.video_title_display}</h2>
            </div>
            <button type="button" onClick={() => { setHistoryItem(null); setHistory([]); }} className="rounded-full border border-border/70 px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/40">关闭</button>
          </div>
          <div className="mt-4 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
            {history.length > 0 ? history.map((item, index) => (
              <div key={`${item.username}-${item.created_at}-${index}`} className="grid gap-2 p-4 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="font-medium text-foreground">{item.username}</div>
                <div>萝卜 {item.carrot}</div>
                <div>{formatDateTime(item.created_at)}</div>
              </div>
            )) : <div className="p-4 text-sm text-muted-foreground">暂无求片历史。</div>}
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}
