"use client";

import { Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
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

export default function ProxyPage() {
  const { token } = useUserConsole();
  const [lines, setLines] = useState<ProxyLineItem[]>([]);
  const [onlySelf, setOnlySelf] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProxyFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [action, setAction] = useState("idle");
  const [pendingDelete, setPendingDelete] = useState<ProxyLineItem | null>(null);
  const [message, setMessage] = useState("");

  const selfLines = useMemo(() => lines.filter((line) => line.is_self), [lines]);
  const displayedLines = onlySelf ? selfLines : lines;

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

      {message ? <GlassPanel className="p-4 text-sm text-muted-foreground">{message}</GlassPanel> : null}
      {status === "loading" ? <GlassPanel className="p-8 text-sm text-muted-foreground">正在加载反代线路...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "反代线路加载失败"}</GlassPanel> : null}

      {status === "ready" && displayedLines.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">{onlySelf ? "暂无自己添加的反代线路。" : "暂无反代线路，点击添加线路创建第一条配置。"}</GlassPanel> : null}

      {status === "ready" && displayedLines.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {displayedLines.map((line) => (
            <GlassPanel key={line.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{lineTitle(line)}</h2>
                    {line.is_self ? <span className="rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">我的线路</span> : null}
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-muted-foreground">{line.url || "未提供 URL"}</div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{line.tagline || "暂无简介"}</p>
                  <div className="mt-3 text-xs text-muted-foreground">ID {line.id} · {line.created_at || "创建时间未知"}</div>
                </div>
                <button type="button" onClick={() => handleDeleteLine(line)} disabled={action !== "idle"} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-danger/35 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            </GlassPanel>
          ))}
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
