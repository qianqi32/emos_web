"use client";

import { CalendarClock, CheckCircle2, Copy, Link2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { addProxyLine, deleteProxyLine, getProxyLineList } from "@/lib/api/client";
import type { ProxyLineItem } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

interface ProxyFormState {
  name: string;
  url: string;
  tagline: string;
}

interface ToastState {
  text: string;
  tone: "success" | "error" | "info";
}

const EMPTY_FORM: ProxyFormState = {
  name: "",
  url: "",
  tagline: ""
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function lineTitle(line: ProxyLineItem) {
  return line.name?.trim() || `线路 #${line.id}`;
}

function formatLineDate(value?: string | null) {
  if (!value) {
    return "时间未知";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function isAdminRole(roles: string[]) {
  return roles.includes("admin");
}

export default function ProxyPage() {
  const { token, user } = useUserConsole();
  const [lines, setLines] = useState<ProxyLineItem[]>([]);
  const [onlySelf, setOnlySelf] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProxyFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingDelete, setPendingDelete] = useState<ProxyLineItem | null>(null);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const selfLines = useMemo(() => lines.filter((line) => line.is_self), [lines]);
  const displayedLines = onlySelf ? selfLines : lines;
  const isAdmin = isAdminRole(user.roles ?? []);

  const loadLines = useCallback(async () => {
    setStatus("loading");
    setMessage("");

    try {
      const result = await getProxyLineList(undefined, token);
      setLines(result);
      setStatus("ready");
    } catch (error) {
      setLines([]);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "反代线路加载失败");
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLines();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadLines]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateForm(key: keyof ProxyFormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleAddLine() {
    const name = form.name.trim();
    const url = normalizeUrl(form.url);
    const tagline = form.tagline.trim();

    if (!name || !url || !tagline) {
      setMessage("请填写完整的线路名称、URL 和简介");
      return;
    }

    if (!isValidUrl(url)) {
      setMessage("线路 URL 必须是有效的 http 或 https 地址");
      return;
    }

    void (async () => {
      setAction("add");
      setMessage("");

      try {
        await addProxyLine({ name, url, tagline }, token);
        setForm(EMPTY_FORM);
        setFormOpen(false);
        await loadLines();
        setMessage("线路添加成功");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "添加线路失败");
      } finally {
        setAction("idle");
      }
    })();
  }

  function handleDeleteLine(line: ProxyLineItem) {
    setPendingDelete(line);
  }

  function submitDeleteLine(line: ProxyLineItem) {
    void (async () => {
      setAction(`delete-${line.id}`);
      setMessage("");

      try {
        await deleteProxyLine({ id: String(line.id) }, token);
        setPendingDelete(null);
        await loadLines();
        setMessage("线路已删除");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "删除线路失败");
      } finally {
        setAction("idle");
      }
    })();
  }

  async function handleCopyLine(line: ProxyLineItem) {
    const url = line.url?.trim();

    if (!url) {
      setToast({ text: "该线路没有可复制的 URL", tone: "error" });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast({ text: `已复制线路：${lineTitle(line)}`, tone: "success" });
    } catch {
      setToast({ text: "复制失败，请手动选择线路地址", tone: "error" });
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          Proxy Lines
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">反代设置</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">管理视频播放反代线路，支持查看全部线路、只看自己添加、添加线路与删除线路。</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">总线路 <span className="font-mono text-foreground">{lines.length}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">我的线路 <span className="font-mono text-foreground">{selfLines.length}</span></div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => setFormOpen((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">
              <Plus className="h-4 w-4" />
              添加线路
            </button>
            <label className="inline-flex h-11 items-center justify-between gap-3 rounded-full border border-border/70 bg-background/40 px-4 text-sm text-muted-foreground sm:justify-start">
              <span>只看自己</span>
              <input type="checkbox" checked={onlySelf} onChange={(event) => setOnlySelf(event.target.checked)} className="h-4 w-4 accent-foreground" />
            </label>
          </div>
          <button type="button" onClick={() => void loadLines()} disabled={status === "loading" || action !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />
            刷新列表
          </button>
        </div>
      </GlassPanel>

      {formOpen ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="线路名称" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={form.url} onChange={(event) => updateForm("url", event.target.value)} placeholder="https://proxy.example.com" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <input value={form.tagline} onChange={(event) => updateForm("tagline", event.target.value)} placeholder="线路一句话简介" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={handleAddLine} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">保存</button>
              <button type="button" onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }} disabled={action !== "idle"} className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">取消</button>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {message && status !== "error" ? <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur-xl">{message}</div> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载反代线路...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "反代线路加载失败"}</GlassPanel> : null}

      {status === "ready" && displayedLines.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">{onlySelf ? "暂无自己添加的反代线路。" : "暂无反代线路，点击添加线路创建第一条配置。"}</GlassPanel> : null}

      {status === "ready" && displayedLines.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {displayedLines.map((line) => {
            const canDelete = Boolean(line.is_self) || isAdmin;
            const title = lineTitle(line);
            const url = line.url?.trim() || "未提供 URL";

            return (
              <GlassPanel key={line.id} className="group p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-background/60 sm:p-6">
                <div className="flex min-h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
                        {line.is_self ? <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">我的线路</span> : null}
                      </div>
                    </div>
                    {canDelete ? (
                      <button type="button" onClick={() => handleDeleteLine(line)} disabled={action !== "idle"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger/30 text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`删除 ${title}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <button type="button" onClick={() => void handleCopyLine(line)} className="mt-5 flex h-11 w-full items-center gap-3 rounded-2xl border border-border/70 bg-muted/25 px-4 text-left font-mono text-xs text-muted-foreground shadow-inner transition-colors hover:border-primary/25 hover:bg-muted/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15" title="点击复制线路地址">
                    <Link2 className="h-4 w-4 shrink-0 opacity-65" />
                    <span className="min-w-0 flex-1 truncate">{url}</span>
                    <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
                  </button>

                  <p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-amber-500 dark:text-amber-300">{line.tagline || "暂无线路简介"}</p>

                  <div className="mt-5 border-t border-border/55 pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono"># ID: {line.id}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatLineDate(line.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      ) : null}
      {toast ? (
        <div className="fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-sm sm:right-6 sm:top-6 sm:w-auto lg:right-8 lg:top-8">
          <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/90 px-4 py-3 text-sm shadow-2xl backdrop-blur-xl">
            {toast.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-danger" />}
            <span className="min-w-0 truncate text-muted-foreground">{toast.text}</span>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="确认删除反代线路"
        description={pendingDelete ? `将删除反代线路「${lineTitle(pendingDelete)}」。` : undefined}
        confirmLabel="删除线路"
        loading={action !== "idle"}
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            submitDeleteLine(pendingDelete);
          }
        }}
      />
    </div>
  );
}
