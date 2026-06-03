"use client";

import { CalendarDays, Loader2, RefreshCw, Sparkles, Unlink } from "lucide-react";
import { useState } from "react";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { getRecordList, getTraktCalendar, getTraktDeviceCode, getTraktToken, getTraktWeekly, syncTraktHistory } from "@/lib/api/client";
import type { TraktCalendarItem, TraktDeviceCodeResponse, TraktTokens, TraktWeeklyResponse } from "@/lib/api/trakt";

const TRAKT_STORAGE_KEY = "emos-trakt-tokens";
const SYNC_PAGE_SIZE = 100;

function readTokens() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRAKT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as TraktTokens : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: TraktTokens | null) {
  if (!tokens) {
    window.localStorage.removeItem(TRAKT_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(TRAKT_STORAGE_KEY, JSON.stringify(tokens));
}

function formatDuration(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0 分钟";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours} 小时 ${rest} 分钟` : `${minutes} 分钟`;
}

function formatDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").slice(0, 16);
}

export default function TraktPage() {
  const { token } = useUserConsole();
  const [tokens, setTokens] = useState<TraktTokens | null>(() => readTokens());
  const [deviceCode, setDeviceCode] = useState<TraktDeviceCodeResponse | null>(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [weekly, setWeekly] = useState<TraktWeeklyResponse | null>(null);
  const [calendar, setCalendar] = useState<TraktCalendarItem[]>([]);

  function saveTokens(nextTokens: TraktTokens | null) {
    writeTokens(nextTokens);
    setTokens(nextTokens);
  }

  async function startBind() {
    setStatus("bind");
    setMessage("");
    try {
      setDeviceCode(await getTraktDeviceCode());
      setMessage("请在 Trakt 页面完成授权，然后点击检查授权。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "获取授权码失败");
    } finally {
      setStatus("idle");
    }
  }

  async function checkBind() {
    if (!deviceCode) return;
    setStatus("check");
    setMessage("");
    try {
      const result = await getTraktToken(deviceCode.device_code);
      saveTokens({ access_token: result.access_token, refresh_token: result.refresh_token || null, expires_at: Date.now() + (result.expires_in || 7200) * 1000 });
      setDeviceCode(null);
      setMessage("Trakt 绑定成功");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "授权尚未完成");
    } finally {
      setStatus("idle");
    }
  }

  async function loadCalendar() {
    if (!tokens) return;
    setStatus("calendar");
    setMessage("");
    try {
      const result = await getTraktCalendar(tokens);
      if (result.tokens) saveTokens(result.tokens);
      setCalendar(result.items);
      setMessage("追剧日历已刷新");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "追剧日历加载失败");
    } finally {
      setStatus("idle");
    }
  }

  async function runSync() {
    if (!tokens) return;
    setStatus("sync");
    setMessage("");
    try {
      const result = await getRecordList({ page: 1, page_size: SYNC_PAGE_SIZE }, token);
      const response = await syncTraktHistory(tokens, result.items);
      if (response.tokens) saveTokens(response.tokens);
      setMessage(`已提交 ${response.synced} 条观影记录到 Trakt`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "同步失败");
    } finally {
      setStatus("idle");
    }
  }

  async function loadWeekly(withAi = false) {
    if (!tokens) return;
    setStatus(withAi ? "weekly-ai" : "weekly");
    setMessage("");
    try {
      const result = await getTraktWeekly(tokens, withAi);
      if (result.tokens) saveTokens(result.tokens);
      setWeekly(result);
      setMessage(withAi && !result.ai_review ? "周报已生成，AI 辣评未启用或生成失败" : "周报已生成");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "周报生成失败");
    } finally {
      setStatus("idle");
    }
  }

  function unbind() {
    saveTokens(null);
    setDeviceCode(null);
    setWeekly(null);
    setCalendar([]);
    setMessage("已解绑 Trakt");
  }

  const loading = status !== "idle";

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={message} tone="success" onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Trakt Center
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trakt 与观影周报</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">绑定 Trakt 后可同步 EMOS 观影历史、查看追剧日历并生成上周观影总结。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="inline-flex h-10 items-center rounded-full border border-border/70 bg-background/45 px-4 text-xs font-semibold text-muted-foreground">
              Trakt：<span className={tokens ? "ml-1 text-success" : "ml-1 text-warning"}>{tokens ? "已绑定" : "未绑定"}</span>
            </span>
            {!tokens ? <button type="button" onClick={startBind} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50">开始绑定</button> : null}
            {tokens ? <button type="button" onClick={unbind} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-danger/35 px-4 text-sm font-semibold text-danger disabled:opacity-50"><Unlink className="h-4 w-4" />解绑</button> : null}
          </div>
        </div>
      </GlassPanel>

      {deviceCode ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="rounded-3xl border border-border/60 bg-muted/15 p-4">
            <div className="text-sm text-muted-foreground">访问 <span className="font-mono text-foreground">{deviceCode.verification_url}</span>，输入验证码：</div>
            <div className="mt-2 font-mono text-3xl font-semibold tracking-widest">{deviceCode.user_code}</div>
            <button type="button" onClick={checkBind} disabled={loading} className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50">检查授权</button>
          </div>
        </GlassPanel>
      ) : null}

      {tokens ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={runSync} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">{status === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}同步最近历史</button>
            <button type="button" onClick={() => loadWeekly(false)} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">生成周报</button>
            <button type="button" onClick={() => loadWeekly(true)} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"><Sparkles className="h-4 w-4" />AI 辣评周报</button>
            <button type="button" onClick={loadCalendar} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"><CalendarDays className="h-4 w-4" />追剧日历</button>
          </div>
        </GlassPanel>
      ) : null}


      {weekly ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="text-sm font-semibold">上周观影总结（{weekly.range}）</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm">剧集 <span className="font-mono text-lg text-foreground">{weekly.episode_count}</span> 集</div>
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm">电影 <span className="font-mono text-lg text-foreground">{weekly.movie_count}</span> 部</div>
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm">总时长 <span className="font-mono text-lg text-foreground">{formatDuration(weekly.total_minutes)}</span></div>
          </div>
          {weekly.ai_review ? <div className="mt-4 rounded-3xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{weekly.ai_review}</div> : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {weekly.shows.map((item) => <div key={item.title} className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">{item.count} 集 · {formatDuration(item.minutes)}</div></div>)}
            {weekly.movies.map((item) => <div key={item.title} className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-muted-foreground">电影 · {formatDuration(item.minutes)}</div></div>)}
          </div>
        </GlassPanel>
      ) : null}

      {calendar.length > 0 ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="text-sm font-semibold">未来 7 天追剧日历</div>
          <div className="mt-4 grid gap-3">
            {calendar.map((item) => <div key={`${item.show_title}-${item.episode_number}-${item.first_aired}`} className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm"><div className="font-medium">{item.show_title} · {item.episode_number}</div><div className="mt-1 text-xs text-muted-foreground">{item.episode_title} · {formatDateTime(item.first_aired)}</div></div>)}
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}
