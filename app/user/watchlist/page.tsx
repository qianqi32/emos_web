"use client";

import { BookmarkPlus, Eye, EyeOff, Plus, RefreshCw, Search, SearchCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TemporaryFileInput } from "@/components/ui/temporary-file-input";
import { deleteWatch, getWatchList, redeemWatchSlot, saveWatch, sortWatch, toggleWatchShow, toggleWatchSubscribe } from "@/lib/api/client";
import type { WatchListItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 20;

interface WatchFormState {
  id: number | null;
  name: string;
  description: string;
  is_public: boolean;
  point: string;
  tags: string;
  is_show_empty: boolean;
  image_poster_url: string;
}

type WatchTab = "all" | "mine" | "public" | "subscribed" | "free";
type SearchMode = "name" | "author";

type PendingWatchAction =
  | { type: "delete"; item: WatchListItem }
  | { type: "unsubscribe"; item: WatchListItem }
  | { type: "sort"; item: WatchListItem }
  | { type: "slot" }
  | null;

const EMPTY_FORM: WatchFormState = {
  id: null,
  name: "",
  description: "",
  is_public: true,
  point: "0",
  tags: "",
  is_show_empty: true,
  image_poster_url: ""
};

const TABS: { value: WatchTab; label: string }[] = [
  { value: "all", label: "全部片单" },
  { value: "mine", label: "我的片单" },
  { value: "public", label: "公开片单" },
  { value: "subscribed", label: "已订阅" },
  { value: "free", label: "只看免费" }
];

function textValue(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function watchTitle(item: WatchListItem) {
  return item.name?.trim() || `片单 #${item.id}`;
}

function watchPoint(item: WatchListItem) {
  return item.point ?? item.carrot ?? 0;
}

function formatTags(value: string) {
  return value.split(",").map((tag) => tag.trim()).filter(Boolean);
}

function formFromWatch(item: WatchListItem): WatchFormState {
  return {
    id: item.id,
    name: item.name || "",
    description: item.description || "",
    is_public: item.is_public,
    point: String(watchPoint(item)),
    tags: item.tags?.join(", ") || "",
    is_show_empty: item.is_show_empty,
    image_poster_url: item.image_poster_url || ""
  };
}

export default function WatchlistPage() {
  const { token, user, setUser } = useUserConsole();
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<WatchListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [tab, setTab] = useState<WatchTab>("all");
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("name");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedSearchMode, setAppliedSearchMode] = useState<SearchMode>("name");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<WatchFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingWatchAction>(null);
  const [sortInput, setSortInput] = useState("");
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");

  const filteredItems = useMemo(() => {
    if (tab === "mine") {
      return items.filter((item) => item.is_self);
    }

    if (tab === "public") {
      return items.filter((item) => item.is_public);
    }

    if (tab === "subscribed") {
      return items.filter((item) => item.is_subscribe);
    }

    if (tab === "free") {
      return items.filter((item) => watchPoint(item) === 0);
    }

    return items;
  }, [items, tab]);

  const mineCount = useMemo(() => items.filter((item) => item.is_self).length, [items]);
  const subscribedCount = useMemo(() => items.filter((item) => item.is_subscribe).length, [items]);

  const loadItems = useCallback(async (mode: "reset" | "append" = "reset", pageToLoad = 1) => {
    setStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setAction((current) => (mode === "append" ? "load-more" : current));
    setMessage("");

    try {
      const searchParams = appliedSearch ? { [appliedSearchMode === "name" ? "name" : "author_username"]: appliedSearch } : {};
      const result = await getWatchList({ ...searchParams, page: pageToLoad, page_size: PAGE_SIZE }, token);
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
      setMessage(error instanceof Error ? error.message : "片单加载失败");
    } finally {
      setAction((current) => (current === "load-more" ? "idle" : current));
    }
  }, [appliedSearch, appliedSearchMode, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadItems("reset", 1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadItems]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasMore || status !== "ready" || action !== "idle") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        void loadItems("append", nextPage);
      }
    }, { rootMargin: "360px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, [action, hasMore, loadItems, nextPage, status]);

  function updateForm(key: keyof WatchFormState, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateForm() {
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setMessage("");
  }

  function openEditForm(item: WatchListItem) {
    setForm(formFromWatch(item));
    setFormOpen(true);
    setMessage("");
  }

  function runAction(actionName: string, executor: () => Promise<string>, options?: { dialog?: boolean }) {
    void (async () => {
      setAction(actionName);
      setMessage("");
      setDialogError("");

      try {
        const result = await executor();
        setMessage(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "操作失败";

        if (options?.dialog) {
          setDialogError(errorMessage);
        } else {
          setMessage(errorMessage);
        }
      } finally {
        setAction("idle");
      }
    })();
  }

  function handleSave() {
    const name = form.name.trim();
    const description = form.description.trim();
    const point = Number(form.point || 0);
    const imagePosterUrl = form.image_poster_url.trim();

    if (!name || !description) {
      setMessage("请填写片单名称和简介");
      return;
    }

    if (!Number.isFinite(point) || point < 0 || point > 50000) {
      setMessage("所需萝卜必须在 0 到 50000 之间");
      return;
    }

    runAction("save", async () => {
      await saveWatch({
        id: form.id,
        name,
        description,
        is_public: form.is_public,
        point,
        tags: formatTags(form.tags),
        is_show_empty: form.is_show_empty,
        image_poster_url: imagePosterUrl || null
      }, token);
      setForm(EMPTY_FORM);
      setFormOpen(false);
      await loadItems("reset", 1);
      return form.id ? "片单已更新" : "片单已创建";
    });
  }

  function handleDelete(item: WatchListItem) {
    setDialogError("");
    setPendingAction({ type: "delete", item });
  }

  function submitDelete(item: WatchListItem) {
    runAction(`delete-${item.id}`, async () => {
      await deleteWatch(String(item.id), token);
      setPendingAction(null);
      await loadItems("reset", 1);
      return "片单已删除";
    }, { dialog: true });
  }

  function handleSubscribe(item: WatchListItem) {
    if (item.is_subscribe) {
      setDialogError("");
      setPendingAction({ type: "unsubscribe", item });
      return;
    }

    submitSubscribe(item);
  }

  function submitSubscribe(item: WatchListItem) {
    runAction(`subscribe-${item.id}`, async () => {
      const result = await toggleWatchSubscribe(String(item.id), { sort: item.user_sort ?? 80 }, token);
      setPendingAction(null);
      await loadItems("reset", 1);
      return result.is_subscribe ? "片单已订阅" : "已取消订阅";
    }, item.is_subscribe ? { dialog: true } : undefined);
  }

  function handleSort(item: WatchListItem) {
    setSortInput(String(item.user_sort ?? 80));
    setDialogError("");
    setPendingAction({ type: "sort", item });
  }

  function submitSort(item: WatchListItem) {
    const sort = Number(sortInput);
    if (!Number.isFinite(sort)) {
      setDialogError("排序值必须是数字");
      return;
    }

    runAction(`sort-${item.id}`, async () => {
      await sortWatch(String(item.id), { sort }, token);
      setPendingAction(null);
      await loadItems("reset", 1);
      return "排序已更新";
    }, { dialog: true });
  }

  function handleToggleShow(item: WatchListItem) {
    runAction(`show-${item.id}`, async () => {
      const result = await toggleWatchShow(String(item.id), token);
      await loadItems("reset", 1);
      return result.is_show ? "片单已显示" : "片单已隐藏";
    });
  }

  function handleRedeemSlot() {
    setDialogError("");
    setPendingAction({ type: "slot" });
  }

  function submitRedeemSlot() {
    runAction("slot", async () => {
      const result = await redeemWatchSlot(token);
      setPendingAction(null);
      setUser({ ...user, slot_remaining: result.slot_remaining });
      return `兑换成功，剩余卡槽 ${result.slot_remaining}`;
    }, { dialog: true });
  }

  function handleSearch() {
    setAppliedSearch(search.trim());
    setAppliedSearchMode(searchMode);
  }

  function toggleSearchMode() {
    setSearchMode((current) => (current === "name" ? "author" : "name"));
  }

  const searchPlaceholder = searchMode === "name" ? "按片单名称搜索" : "按作者名称搜索";

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <BookmarkPlus className="h-3.5 w-3.5" />
          Watchlist
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">片单列表</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">管理我的片单、公开片单和已订阅片单，支持创建、编辑、删除、订阅、排序与显示状态切换。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:flex">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">我的 <span className="font-mono text-foreground">{mineCount}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">订阅 <span className="font-mono text-foreground">{subscribedCount}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">额度 <span className="font-mono text-foreground">{user.slot_remaining}</span></div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={openCreateForm} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" />
              创建片单
            </button>
            <button type="button" onClick={handleRedeemSlot} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full border border-danger/35 px-5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">兑换卡槽</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:min-w-[560px]">
            <div className="relative">
              <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { handleSearch(); } }} placeholder={searchPlaceholder} className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 pr-12 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <button type="button" onClick={toggleSearchMode} className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground" aria-label={searchMode === "name" ? "切换为按作者名称搜索" : "切换为按片单名称搜索"} title={searchMode === "name" ? "按片单名称搜索" : "按作者名称搜索"}>
                {searchMode === "name" ? <Search className="h-4 w-4" /> : <SearchCheck className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" onClick={handleSearch} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40">
              <Search className="h-4 w-4" />
              搜索
            </button>
            <button type="button" onClick={() => void loadItems("reset", 1)} disabled={status === "loading" || action !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button key={item.value} type="button" onClick={() => setTab(item.value)} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${tab === item.value ? "border-foreground bg-foreground text-background" : "border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
      </GlassPanel>

      {formOpen ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-2">
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="片单名称" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={form.point} onChange={(event) => updateForm("point", event.target.value)} placeholder="所需萝卜" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={form.tags} onChange={(event) => updateForm("tags", event.target.value)} placeholder="标签，使用英文逗号分隔" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <TemporaryFileInput label="片单封面 URL，可手填或上传文件" value={form.image_poster_url} emosId={user.user_id} accept="image/*" onChange={(value) => updateForm("image_poster_url", value)} onMessage={setMessage} />
            <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="片单简介" className="min-h-28 rounded-3xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15 lg:col-span-2" />
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <label className="inline-flex h-11 items-center gap-3 rounded-full border border-border/70 px-4 text-sm text-muted-foreground">
                <input type="checkbox" checked={form.is_public} onChange={(event) => updateForm("is_public", event.target.checked)} className="h-4 w-4 accent-foreground" />
                公开片单
              </label>
              <label className="inline-flex h-11 items-center gap-3 rounded-full border border-border/70 px-4 text-sm text-muted-foreground">
                <input type="checkbox" checked={form.is_show_empty} onChange={(event) => updateForm("is_show_empty", event.target.checked)} className="h-4 w-4 accent-foreground" />
                显示空媒体
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex lg:col-span-2">
              <button type="button" onClick={handleSave} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">保存</button>
              <button type="button" onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">取消</button>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {message ? <GlassPanel className="p-4 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载片单...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "片单加载失败"}</GlassPanel> : null}
      {status === "ready" && filteredItems.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">当前筛选下暂无片单。{hasMore ? "继续下拉会加载更多片单。" : ""}</GlassPanel> : null}

      {status === "ready" && filteredItems.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredItems.map((item) => (
            <GlassPanel key={item.id} className="overflow-hidden p-0">
              <div className="grid gap-0 md:grid-cols-[132px_minmax(0,1fr)]">
                <div className="min-h-36 bg-muted/30 md:min-h-full" style={item.image_poster_url ? { backgroundImage: `url(${item.image_poster_url})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined} role={item.image_poster_url ? "img" : undefined} aria-label={item.image_poster_url ? watchTitle(item) : undefined} />
                <div className="min-w-0 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">{watchTitle(item)}</h2>
                        {item.is_self ? <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">我的</span> : null}
                        {item.is_public ? <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">公开</span> : <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">私有</span>}
                        {watchPoint(item) === 0 ? <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">免费</span> : null}
                        {item.is_subscribe ? <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">已订阅</span> : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description || "暂无简介"}</p>
                    </div>
                    <button type="button" onClick={() => handleSubscribe(item)} disabled={action !== "idle"} className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">{item.is_subscribe ? "取消订阅" : "订阅"}</button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <div>视频 <span className="font-mono text-foreground">{textValue(item.video_count, "0")}</span></div>
                    <div>订阅 <span className="font-mono text-foreground">{textValue(item.subscribe_count, "0")}</span></div>
                    <div>萝卜 <span className="font-mono text-foreground">{textValue(watchPoint(item), "0")}</span></div>
                    <div>作者 <span className="text-foreground">{item.author?.username || "官方"}</span></div>
                  </div>

                  {item.tags?.length ? <div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="rounded-full bg-muted/35 px-2.5 py-1 text-[10px] text-muted-foreground">{tag}</span>)}</div> : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => router.push(`/user/watchlist/${item.id}`)} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40">查看详情</button>
                    {item.is_self ? <button type="button" onClick={() => openEditForm(item)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">编辑</button> : null}
                    {item.is_subscribe ? <button type="button" onClick={() => handleSort(item)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">排序</button> : null}
                    {item.is_subscribe ? <button type="button" onClick={() => handleToggleShow(item)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">{item.user_is_show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{item.user_is_show ? "隐藏" : "显示"}</button> : null}
                    {item.is_self ? <button type="button" onClick={() => handleDelete(item)} disabled={action !== "idle"} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />删除</button> : null}
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-8" />
      {status === "ready" && hasMore ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{action === "load-more" ? "正在加载更多片单..." : `已加载 ${items.length} / ${total}，继续下拉加载更多`}</GlassPanel> : null}
      {status === "ready" && !hasMore && items.length > 0 ? <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {total} 个片单</GlassPanel> : null}
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction?.type === "delete"
            ? "确认删除片单"
            : pendingAction?.type === "unsubscribe"
              ? "确认取消订阅"
              : pendingAction?.type === "sort"
                ? "调整订阅排序"
                : "确认兑换片单卡槽"
        }
        description={
          pendingAction?.type === "delete"
            ? `将删除片单「${watchTitle(pendingAction.item)}」。`
            : pendingAction?.type === "unsubscribe"
              ? `将取消订阅「${watchTitle(pendingAction.item)}」。`
              : pendingAction?.type === "sort"
                ? `为「${watchTitle(pendingAction.item)}」设置订阅排序值。`
                : pendingAction?.type === "slot"
                  ? "兑换片单卡槽会立即扣除 1000 萝卜，请确认是否继续"
                  : undefined
        }
        inputLabel={pendingAction?.type === "sort" ? "订阅排序值" : undefined}
        inputValue={pendingAction?.type === "sort" ? sortInput : undefined}
        inputType={pendingAction?.type === "sort" ? "number" : "text"}
        error={dialogError}
        onInputChange={setSortInput}
        confirmText={pendingAction?.type === "slot" ? "兑换卡槽" : undefined}
        confirmLabel={
          pendingAction?.type === "delete"
            ? "删除片单"
            : pendingAction?.type === "unsubscribe"
              ? "取消订阅"
              : pendingAction?.type === "slot"
                ? "扣除 1000 萝卜"
                : "保存排序"
        }
        loading={action !== "idle" && action !== "load-more"}
        tone={pendingAction?.type === "delete" || pendingAction?.type === "slot" ? "danger" : "default"}
        onCancel={() => { setPendingAction(null); setDialogError(""); }}
        onConfirm={() => {
          if (pendingAction?.type === "delete") {
            submitDelete(pendingAction.item);
          } else if (pendingAction?.type === "unsubscribe") {
            submitSubscribe(pendingAction.item);
          } else if (pendingAction?.type === "sort") {
            submitSort(pendingAction.item);
          } else if (pendingAction?.type === "slot") {
            submitRedeemSlot();
          }
        }}
      />
    </div>
  );
}
