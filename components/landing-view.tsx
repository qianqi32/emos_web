import { ArrowRight, KeyRound, Settings, X } from "lucide-react";
import { useState } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { GlassPanel } from "@/components/ui/glass-panel";
import { DEFAULT_API_HOST, getStoredApiHost, setStoredApiHost } from "@/lib/api/host";

interface LandingViewProps {
  token: string;
  status: "idle" | "loading" | "error";
  message: string;
  onTokenChange: (value: string) => void;
  onTokenLogin: () => void;
  onAuthLogin: () => void;
}

export function LandingView({ token, status, message, onTokenChange, onTokenLogin, onAuthLogin }: LandingViewProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiHost, setApiHost] = useState(getStoredApiHost);

  function handleSaveApiHost() {
    setStoredApiHost(apiHost || DEFAULT_API_HOST);
    setApiHost(getStoredApiHost());
    setSettingsOpen(false);
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-[1280px] items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="space-y-7">
        <AppTopBar />
        <div className="space-y-5">
          <h1 className="max-w-4xl text-4xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            EMOS<br />
            <span className="text-muted-foreground">CONTROL CONSOLE</span>
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            面向 EMOS 用户的 serverless 自助控制台，管理账号、服务、设备、邀请与媒体数据。
          </p>
        </div>
      </section>

      <GlassPanel className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sign In</div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">请选择登录方式</h2>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={onAuthLogin}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            跳转网页授权登录
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或者使用 Token
            <span className="h-px flex-1 bg-border" />
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">输入你的 Token (Bearer xxxx)</span>
            <input
              value={token}
              onChange={(event) => onTokenChange(event.target.value)}
              placeholder="Bearer xxxx"
              className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <button
            type="button"
            onClick={onTokenLogin}
            disabled={!token.trim() || status === "loading"}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background/50 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {status === "loading" ? "验证中..." : "验证并登录"}
          </button>

          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
            <Settings className="h-3.5 w-3.5" />
            API Host 设置
          </button>

          {message ? <p className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">{message}</p> : null}
          {status === "loading" && !message ? <p className="text-center text-xs text-muted-foreground">正在检测登录状态，请稍候。</p> : null}
        </div>
      </GlassPanel>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-md">
          <button type="button" aria-label="关闭登录设置" className="absolute inset-0" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl border border-border/70 bg-background/95 p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sign In Settings</div>
                <h3 className="mt-2 text-xl font-bold tracking-tight">登录设置</h3>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-xs font-semibold text-muted-foreground">API Host</span>
              <input value={apiHost} onChange={(event) => setApiHost(event.target.value)} placeholder={DEFAULT_API_HOST} className="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
            </label>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">通常不需要修改，默认使用 <span className="font-mono text-foreground">{DEFAULT_API_HOST}</span></p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setApiHost(DEFAULT_API_HOST)} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40">恢复默认</button>
              <button type="button" onClick={handleSaveApiHost} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-90">保存设置</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
