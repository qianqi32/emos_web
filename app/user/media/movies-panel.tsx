"use client";

import { ImageOff, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getVideoList } from "@/lib/api/client";
import type { VideoListItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 24;

type MediaTypeFilter = "" | "movie" | "tv";
type MediaAvailabilityFilter = "" | "true" | "false";

function readMediaType(value: string | null): MediaTypeFilter {
  return value === "movie" || value === "tv" ? value : "";
}

function readMediaAvailability(value: string | null): MediaAvailabilityFilter {
  return value === "true" || value === "false" ? value : "";
}

function videoTypeLabel(type?: string | null) {
  if (type === "tv") {
    return "剧集";
  }

  if (type === "movie") {
    return "电影";
  }

  return "未知";
}

function videoYear(date?: string | null) {
  return date ? date.slice(0, 4) : "年份未知";
}

function truncateText(value?: string | null) {
  if (!value) {
    return "暂无简介";
  }

  return value.length > 96 ? `${value.slice(0, 96)}...` : value;
}

function MediaSkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="aspect-[2/3] animate-pulse rounded-3xl border border-border/50 bg-muted/25" />
      ))}
    </div>
  );
}

function MediaCard({ item }: { item: VideoListItem }) {
  const title = item.video_title || item.video_origin_title || `Video ${item.video_id}`;
  const genres = item.genres?.slice(0, 2).map((genre) => genre.name).join(" · ");

  return (
    <Link href={`/user/media/${item.video_id}`} className="group block rounded-3xl focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/15">
      <article className="overflow-hidden rounded-3xl border border-border/55 bg-background/45 shadow-glass transition-transform duration-200 hover:-translate-y-1 hover:bg-background/60">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted/30">
          {item.video_image_poster ? <div role="img" className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${item.video_image_poster})` }} aria-label={title} /> : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,hsl(var(--muted))_0%,transparent_55%),linear-gradient(135deg,hsl(var(--muted)/0.35),hsl(var(--background)/0.85))] px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/50 bg-background/45 text-muted-foreground shadow-sm backdrop-blur-md">
                <ImageOff className="h-6 w-6" />
              </div>
              <div className="mt-3 line-clamp-2 text-xs font-semibold text-muted-foreground/80">{title}</div>
            </div>
          )}
          <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">{videoTypeLabel(item.video_type)}</div>
          {item.medias_count ? <div className="absolute right-3 top-3 rounded-full border border-success/25 bg-success/20 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">{item.medias_count} 资源</div> : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <div className="line-clamp-2 text-sm font-semibold">{title}</div>
            <div className="mt-1 text-xs text-white/75">{videoYear(item.video_date_air)}</div>
            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/70">{truncateText(item.video_description)}</p>
          </div>
        </div>
        <div className="border-t border-border/45 bg-background/70 p-4 backdrop-blur-md">
          <div className="line-clamp-1 text-sm font-semibold">{title}</div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{videoYear(item.video_date_air)}</span>
            <span>{item.video_type === "tv" ? "TV" : item.video_type === "movie" ? "Movie" : "Video"}</span>
          </div>
          <div className="mt-3 min-h-[16px] line-clamp-1 text-[11px] text-muted-foreground">{genres || "未分类"}</div>
        </div>
      </article>
    </Link>
  );
}

export function MoviesPanel() {
  const { token } = useUserConsole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const initialScrollYRef = useRef(0);
  const [canAutoLoadMore, setCanAutoLoadMore] = useState(false);
  const initialTitle = searchParams.get("title") ?? "";
  const initialType = readMediaType(searchParams.get("type"));
  const initialWithMedia = readMediaAvailability(searchParams.get("with_media"));
  const [items, setItems] = useState<VideoListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [searchTitle, setSearchTitle] = useState(initialTitle);
  const [type, setType] = useState<MediaTypeFilter>(initialType);
  const [withMedia, setWithMedia] = useState<MediaAvailabilityFilter>(initialWithMedia);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");

  const params = useMemo(
    () => ({
      title: searchTitle.trim() || undefined,
      type: type || undefined,
      with_media: withMedia ? (withMedia === "true" ? 1 : 0) : undefined
    }),
    [searchTitle, type, withMedia]
  );

  const loadMedia = useCallback(async (mode: "reset" | "append" = "reset", pageToLoad = 1) => {
    setStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setLoadingMore(mode === "append");
    setMessage("");

    try {
      const response = await getVideoList({ ...params, page: pageToLoad, page_size: PAGE_SIZE }, token);
      setItems((current) => (mode === "append" ? [...current, ...response.items] : response.items));
      setTotal(response.total);
      setNextPage(pageToLoad + 1);
      setHasMore(pageToLoad * response.page_size < response.total);
      setStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "媒体库加载失败");
    } finally {
      setLoadingMore(false);
    }
  }, [params, token]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();
    const trimmedTitle = searchTitle.trim();

    if (trimmedTitle) {
      nextSearchParams.set("title", trimmedTitle);
    }

    if (type) {
      nextSearchParams.set("type", type);
    }

    if (withMedia) {
      nextSearchParams.set("with_media", withMedia);
    }

    const query = nextSearchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchTitle, type, withMedia]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanAutoLoadMore(false);
      initialScrollYRef.current = window.scrollY;
      void loadMedia("reset", 1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMedia]);

  useEffect(() => {
    initialScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY - initialScrollYRef.current > 160) {
        setCanAutoLoadMore(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasMore || status !== "ready" || loadingMore || !canAutoLoadMore) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setCanAutoLoadMore(false);
        void loadMedia("append", nextPage);
      }
    }, { rootMargin: "120px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [canAutoLoadMore, hasMore, loadMedia, loadingMore, nextPage, status]);

  function handleSearch() {
    setSearchTitle(title);
  }

  function handleReset() {
    setTitle("");
    setSearchTitle("");
    setType("");
    setWithMedia("");
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSearch()} placeholder="搜索标题" className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value as MediaTypeFilter)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            <option value="">全部类型</option>
            <option value="movie">电影</option>
            <option value="tv">剧集</option>
          </select>
          <select value={withMedia} onChange={(event) => setWithMedia(event.target.value as MediaAvailabilityFilter)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            <option value="">全部资源</option>
            <option value="true">仅有资源</option>
            <option value="false">仅无资源</option>
          </select>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button type="button" onClick={handleSearch} disabled={status === "loading"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">搜索</button>
            <button type="button" onClick={handleReset} disabled={status === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <X className="h-4 w-4" />
              重置
            </button>
          </div>
        </div>
      </GlassPanel>

      {status === "loading" ? <MediaSkeletonGrid /> : null}
      {status === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
      {status === "ready" && items.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无符合条件的媒体</GlassPanel> : null}
      {status === "ready" && items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {items.map((item) => (
              <MediaCard key={item.video_id} item={item} />
            ))}
          </div>
        </>
      ) : null}
      <div ref={loadMoreRef} className="h-8" />
      {status === "ready" && hasMore ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{loadingMore ? "正在加载更多媒体..." : `已加载 ${items.length} / ${total}，继续下拉加载更多`}</GlassPanel> : null}
      {status === "ready" && !hasMore && items.length > 0 ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {total} 条媒体</GlassPanel> : null}
    </div>
  );
}
