"use client";

import { ArrowLeft, BookmarkPlus, ExternalLink, Link2, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, use } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { batchUpdateWatchVideos, clearWatchVideos, deleteWatchVideo, getWatchList, getWatchVideoList, searchWatchVideo, updateWatchDynamic, updateWatchVideo } from "@/lib/api/client";
import type { WatchListItem, WatchVideoItem, WatchVideoSearchItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { useRouter } from "next/navigation";

const VIDEO_PAGE_SIZE = 20;
const SEARCH_PAGE_SIZE = 10;

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function watchPoint(item: WatchListItem) {
  return item.point ?? item.carrot ?? 0;
}

type VideoTab = "list" | "add" | "dynamic" | "batch";

type PendingVideoAction =
  | { type: "remove"; video: WatchVideoItem }
  | { type: "clear" }
  | { type: "dynamic-clear" }
  | { type: "batch"; count: number; items: { type: string; value: string }[] }
  | null;

export default function WatchlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: watchId } = use(params);
  const { token } = useUserConsole();
  const router = useRouter();

  const [watch, setWatch] = useState<WatchListItem | null>(null);
  const [watchStatus, setWatchStatus] = useState<"loading" | "ready" | "error">("loading");

  const [videos, setVideos] = useState<WatchVideoItem[]>([]);
  const [videoTotal, setVideoTotal] = useState(0);
  const [videoPage, setVideoPage] = useState(1);
  const [videoHasMore, setVideoHasMore] = useState(false);
  const [videoStatus, setVideoStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [tab, setTab] = useState<VideoTab>("list");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingVideoAction>(null);
  const [message, setMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WatchVideoSearchItem[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [dynamicUrl, setDynamicUrl] = useState("");

  const [batchInput, setBatchInput] = useState("");

  const canEditVideos = Boolean(watch?.is_edit_video ?? watch?.is_self ?? false);

  const loadWatch = useCallback(async () => {
    setWatchStatus("loading");
    setMessage("");
    try {
      const result = await getWatchList({ watch_id: watchId }, token);
      const item = result.items?.find((entry) => String(entry.id) === watchId) ?? null;
      if (!item) {
        setWatchStatus("error");
        setMessage("片单不存在或无权查看");
        return;
      }
      setWatch(item);
      setWatchStatus("ready");
    } catch (error) {
      setWatchStatus("error");
      setMessage(error instanceof Error ? error.message : "片单加载失败");
    }
  }, [watchId, token]);

  const loadVideos = useCallback(async (mode: "reset" | "append" = "reset", pageToLoad = 1) => {
    setVideoStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    try {
      const result = await getWatchVideoList(watchId, { page: pageToLoad, page_size: VIDEO_PAGE_SIZE }, token);
      setVideos((current) => {
        if (mode !== "append") return result.items;
        const existingIds = new Set(current.map((v) => v.video_id));
        return [...current, ...result.items.filter((v) => !existingIds.has(v.video_id))];
      });
      setVideoTotal(result.total);
      setVideoPage(pageToLoad + 1);
      setVideoHasMore(pageToLoad * result.page_size < result.total);
      setVideoStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setVideos([]);
        setVideoTotal(0);
        setVideoHasMore(false);
        setVideoStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "视频列表加载失败");
    }
  }, [watchId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWatch();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWatch]);

  useEffect(() => {
    if (watchStatus !== "ready") return;
    const timer = window.setTimeout(() => {
      void loadVideos("reset", 1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [watchStatus, loadVideos]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !videoHasMore || videoStatus !== "ready" || action !== "idle") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadVideos("append", videoPage);
    }, { rootMargin: "360px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [action, videoHasMore, loadVideos, videoPage, videoStatus]);

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

  function handleAddVideo(video: WatchVideoSearchItem) {
    runAction(`add-${video.video_id}`, async () => {
      await updateWatchVideo(watchId, String(video.video_id), {
        sort: 0
      }, token);
      setSearchResults((current) => current.filter((v) => v.video_id !== video.video_id));
      await loadVideos("reset", 1);
      await loadWatch();
      return `已添加「${video.video_title}」`;
    });
  }

  function handleRemoveVideo(video: WatchVideoItem) {
    setPendingAction({ type: "remove", video });
  }

  function submitRemoveVideo(video: WatchVideoItem) {
    runAction(`remove-${video.video_id}`, async () => {
      await deleteWatchVideo(watchId, String(video.video_id), token);
      setPendingAction(null);
      await loadVideos("reset", 1);
      await loadWatch();
      return `已移除「${video.video_title}」`;
    });
  }

  function handleClearVideos() {
    setPendingAction({ type: "clear" });
  }

  function submitClearVideos() {
    runAction("clear", async () => {
      await clearWatchVideos(watchId, token);
      setPendingAction(null);
      setVideos([]);
      setVideoTotal(0);
      await loadWatch();
      return "片单已清空";
    });
  }

  function handleSearchVideos() {
    const query = searchQuery.trim();
    if (!query) return;
    void (async () => {
      setSearchStatus("loading");
      try {
        const results = await searchWatchVideo(watchId, { title: query, page_size: SEARCH_PAGE_SIZE }, token);
        setSearchResults(results);
        setSearchStatus("ready");
      } catch (error) {
        setSearchStatus("error");
        setMessage(error instanceof Error ? error.message : "搜索失败");
      }
    })();
  }

  function handleDynamicUpdate() {
    const url = dynamicUrl.trim();
    if (!url) {
      setMessage("请输入动态抓取 URL");
      return;
    }
    runAction("dynamic", async () => {
      const result = await updateWatchDynamic(watchId, { url }, token);
      await loadWatch();
      return result.url ? `动态抓取已设置：${result.url}` : "动态抓取已清除";
    });
  }

  function handleDynamicClear() {
    setPendingAction({ type: "dynamic-clear" });
  }

  function submitDynamicClear() {
    runAction("dynamic-clear", async () => {
      await updateWatchDynamic(watchId, { url: "" }, token);
      setPendingAction(null);
      setDynamicUrl("");
      await loadWatch();
      return "动态抓取已清除";
    });
  }

  function handleBatchUpdate() {
    const input = batchInput.trim();
    if (!input) {
      setMessage("请输入批量数据");
      return;
    }
    const lines = input.split("\n").map((line) => line.trim()).filter(Boolean);
    const items = lines.map((line) => {
      const parts = line.split("|");
      const rawId = parts[0]?.trim();
      if (!rawId) return null;
      if (parts.length >= 3 && (parts[1]?.trim() || parts[2]?.trim())) {
        const hasTmdb = parts[2]?.trim();
        return {
          type: hasTmdb ? (parts[3]?.trim() === "series" ? "tmdb_tv" : "tmdb_movie") : "todb",
          value: hasTmdb || parts[1]?.trim() || rawId
        };
      }
      return { type: "video_id" as const, value: rawId };
    }).filter((item): item is { type: string; value: string } => item !== null);

    if (items.length === 0) {
      setMessage("未解析到有效数据，每行格式：video_id 或 todb_id|tmdb_id|type|title");
      return;
    }

    setPendingAction({ type: "batch", count: items.length, items });
  }

  function submitBatchUpdate(count: number, items: { type: string; value: string }[]) {
    runAction("batch", async () => {
      await batchUpdateWatchVideos(watchId, items, token);
      setPendingAction(null);
      setBatchInput("");
      await loadVideos("reset", 1);
      await loadWatch();
      return `已批量更新 ${count} 条视频`;
    });
  }

  const videoTypeLabel: Record<string, string> = { movie: "电影", series: "剧集", episode: "单集" };

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={watchStatus === "error" ? "" : message} onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <button type="button" onClick={() => router.push("/user/watchlist")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回片单列表
        </button>

        {watchStatus === "loading" ? <div className="mt-6 text-sm text-muted-foreground">正在加载片单...</div> : null}
        {watchStatus === "error" ? <div className="mt-6 text-sm text-danger">{message || "片单加载失败"}</div> : null}

        {watchStatus === "ready" && watch ? (
          <div className="mt-6">
            <div className="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
              {watch.image_poster_url ? (
                <div className="min-h-48 rounded-2xl bg-muted/30 md:min-h-full" style={{ backgroundImage: `url(${watch.image_poster_url})`, backgroundPosition: "center", backgroundSize: "cover" }} role="img" aria-label={watch.name} />
              ) : (
                <div className="min-h-48 rounded-2xl bg-muted/30 md:min-h-full flex items-center justify-center">
                  <BookmarkPlus className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="min-w-0 p-5 md:pl-6">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">{watch.name || `片单 #${watch.id}`}</h1>
                  {watch.is_self ? <StatusBadge tone="success">我的</StatusBadge> : null}
                  {watch.is_public ? <StatusBadge tone="info">公开</StatusBadge> : <StatusBadge tone="muted">私有</StatusBadge>}
                  {watchPoint(watch) === 0 ? <StatusBadge tone="success">免费</StatusBadge> : null}
                  {watch.is_subscribe ? <StatusBadge tone="info">已订阅</StatusBadge> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{watch.description || "暂无简介"}</p>
                {watch.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {watch.tags.map((tag) => <span key={tag} className="rounded-full bg-muted/35 px-2.5 py-1 text-[10px] text-muted-foreground">{tag}</span>)}
                  </div>
                ) : null}
                <div className="mt-4 text-xs text-muted-foreground">
                  作者：<span className="text-foreground">{watch.author?.username || "官方"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard label="视频数" value={textValue(videoStatus === "ready" ? videoTotal : watch.video_count, "0")} />
              <MetricCard label="订阅数" value={textValue(watch.subscribe_count, "0")} />
              <MetricCard label="所需萝卜" value={textValue(watchPoint(watch), "0")} />
              <MetricCard label="卡槽剩余" value={textValue(watch.slot_remaining, "-")} />
            </div>
          </div>
        ) : null}
      </GlassPanel>

      {watchStatus === "ready" && watch ? (
        <>
          <GlassPanel className="p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {(["list", "add", "dynamic", "batch"] as VideoTab[]).map((t) => {
                const labels: Record<VideoTab, string> = { list: "视频列表", add: "添加视频", dynamic: "动态抓取", batch: "批量设置" };
                const disabled = t !== "list" && !canEditVideos;
                return (
                  <button key={t} type="button" onClick={() => !disabled && setTab(t)} disabled={disabled} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}>
                    {labels[t]}
                    {!canEditVideos && t !== "list" ? <span className="ml-1 text-[10px]">(无编辑权限)</span> : null}
                  </button>
                );
              })}
              {canEditVideos ? (
                <button type="button" onClick={handleClearVideos} disabled={action !== "idle" || videos.length === 0} className="ml-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />清空视频
                </button>
              ) : null}
            </div>
          </GlassPanel>


          {tab === "list" ? (
            <>
              <GlassPanel className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">共 {videoTotal} 个视频</span>
                  <button type="button" onClick={() => void loadVideos("reset", 1)} disabled={videoStatus === "loading" || action !== "idle"} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <RefreshCw className="h-3.5 w-3.5" />刷新
                  </button>
                </div>
              </GlassPanel>

              {videoStatus === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载视频列表...</GlassPanel> : null}
              {videoStatus === "error" ? <GlassPanel className="p-8 text-sm text-danger">视频列表加载失败</GlassPanel> : null}
              {videoStatus === "ready" && videos.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">片单暂无视频{canEditVideos ? "，可切换到「添加视频」标签添加" : ""}</GlassPanel> : null}

              {videoStatus === "ready" && videos.length > 0 ? (
                <div className="grid gap-3">
                  {videos.map((video) => (
                    <GlassPanel key={video.video_id} className="p-4">
                      <div className="flex items-start gap-4">
                        {video.video_image_poster ? (
                          <div className="h-20 w-14 shrink-0 rounded-lg bg-muted/30" style={{ backgroundImage: `url(${video.video_image_poster})`, backgroundPosition: "center", backgroundSize: "cover" }} role="img" aria-label={video.video_title} />
                        ) : (
                          <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/30">
                            <BookmarkPlus className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">{video.video_title}</h3>
                              {video.video_origin_title ? <p className="truncate text-xs text-muted-foreground">{video.video_origin_title}</p> : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge tone="muted">{videoTypeLabel[video.video_type] || video.video_type}</StatusBadge>
                              {canEditVideos ? (
                                <button type="button" onClick={() => handleRemoveVideo(video)} disabled={action !== "idle"} className="inline-flex h-7 items-center justify-center rounded-full border border-danger/35 px-2 text-[10px] font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
                                  <X className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {video.video_date_air ? <span>首播 {video.video_date_air}</span> : null}
                            {video.genres?.length ? <span>{video.genres.map((g) => g.name || g.id).join(" / ")}</span> : null}
                            {video.remark ? <span className="text-foreground">{video.remark}</span> : null}
                            {video.sort !== null && video.sort !== undefined ? <span>排序 {video.sort}</span> : null}
                          </div>
                          {video.user_username ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              添加者 <span className="text-foreground">{video.user_username}</span>
                              {video.updated_at ? <span className="ml-2">{video.updated_at}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              ) : null}

              <div ref={loadMoreRef} className="h-8" />
              {videoStatus === "ready" && videoHasMore ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{action === "load-more" ? "正在加载更多视频..." : `已加载 ${videos.length} / ${videoTotal}，继续下拉加载更多`}</GlassPanel> : null}
              {videoStatus === "ready" && !videoHasMore && videos.length > 0 ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {videoTotal} 个视频</GlassPanel> : null}
            </>
          ) : null}

          {tab === "add" && canEditVideos ? (
            <GlassPanel className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">搜索并添加视频</h2>
              <p className="mt-2 text-sm text-muted-foreground">搜索不在片单中的视频，点击添加到片单。</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSearchVideos(); }} placeholder="输入视频名称搜索" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={handleSearchVideos} disabled={searchStatus === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
                  <Search className="h-4 w-4" />搜索
                </button>
              </div>

              {searchStatus === "loading" ? <div className="mt-4 text-sm text-muted-foreground">搜索中...</div> : null}
              {searchStatus === "error" ? <div className="mt-4 text-sm text-danger">搜索失败</div> : null}
              {searchStatus === "ready" && searchResults.length === 0 ? <div className="mt-4 text-sm text-muted-foreground">未找到匹配的视频</div> : null}

              {searchResults.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {searchResults.map((video) => (
                    <div key={video.video_id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/30 p-3">
                      {video.video_image_poster ? (
                        <div className="h-16 w-11 shrink-0 rounded-lg bg-muted/30" style={{ backgroundImage: `url(${video.video_image_poster})`, backgroundPosition: "center", backgroundSize: "cover" }} role="img" aria-label={video.video_title} />
                      ) : (
                        <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-muted/30">
                          <BookmarkPlus className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium">{video.video_title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusBadge tone="muted">{videoTypeLabel[video.video_type] || video.video_type}</StatusBadge>
                          {video.video_date_air ? <span>{video.video_date_air}</span> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleAddVideo(video)} disabled={action !== "idle"} className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                        <Plus className="h-3.5 w-3.5" />添加
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </GlassPanel>
          ) : null}

          {tab === "dynamic" && canEditVideos ? (
            <GlassPanel className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">动态抓取</h2>
              <p className="mt-2 text-sm text-muted-foreground">设置动态抓取 URL，系统将自动从该地址抓取视频并加入片单。留空则清除。</p>
              <div className="mt-4 grid gap-3">
                <input value={dynamicUrl} onChange={(e) => setDynamicUrl(e.target.value)} placeholder="输入动态抓取 URL" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleDynamicUpdate} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                    <Link2 className="h-4 w-4" />设置
                  </button>
                  <button type="button" onClick={handleDynamicClear} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
                    <X className="h-4 w-4" />清除
                  </button>
                </div>
              </div>
              {watch?.dynamic_url ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/50 bg-background/30 p-3 text-sm">
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">当前：{String(watch.dynamic_url)}</span>
                </div>
              ) : null}
            </GlassPanel>
          ) : null}

          {tab === "batch" && canEditVideos ? (
            <GlassPanel className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">批量设置</h2>
              <p className="mt-2 text-sm text-muted-foreground">批量更新片单视频，每行一条，格式：<code className="rounded bg-muted/50 px-1.5 py-0.5 text-xs">video_id|todb_id|tmdb_id|video_type|title</code>。todb_id 和 tmdb_id 可省略。</p>
              <div className="mt-4 grid gap-3">
                <textarea value={batchInput} onChange={(e) => setBatchInput(e.target.value)} placeholder={"1|||movie|示例电影\n2|123|456|series|示例剧集"} className="min-h-40 rounded-3xl border border-border/70 bg-background/50 px-4 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
                <button type="button" onClick={handleBatchUpdate} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                  <RefreshCw className="h-4 w-4" />批量更新
                </button>
              </div>
            </GlassPanel>
          ) : null}
        </>
      ) : null}
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "remove"
            ? "确认移除视频"
            : pendingAction?.type === "clear"
              ? "确认清空片单"
              : pendingAction?.type === "dynamic-clear"
                ? "确认清除动态抓取"
                : "确认批量更新"
        }
        description={
          pendingAction?.type === "remove"
            ? `将从片单移除「${pendingAction.video.video_title}」。`
            : pendingAction?.type === "clear"
              ? "将清空片单内所有视频，此操作不可撤销。"
              : pendingAction?.type === "dynamic-clear"
                ? "将清除当前片单的动态抓取 URL。"
                : pendingAction?.type === "batch"
                  ? `将批量更新 ${pendingAction.count} 条视频。`
                  : undefined
        }
        confirmText={pendingAction?.type === "clear" ? "清空" : undefined}
        confirmLabel={
          pendingAction?.type === "remove"
            ? "移除视频"
            : pendingAction?.type === "clear"
              ? "清空片单"
              : pendingAction?.type === "dynamic-clear"
                ? "清除 URL"
                : "批量更新"
        }
        loading={action !== "idle" && action !== "load-more"}
        tone={pendingAction?.type === "remove" || pendingAction?.type === "clear" ? "danger" : "default"}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction?.type === "remove") {
            submitRemoveVideo(pendingAction.video);
          } else if (pendingAction?.type === "clear") {
            submitClearVideos();
          } else if (pendingAction?.type === "dynamic-clear") {
            submitDynamicClear();
          } else if (pendingAction?.type === "batch") {
            submitBatchUpdate(pendingAction.count, pendingAction.items);
          }
        }}
      />
    </div>
  );
}
