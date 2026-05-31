"use client";

import { MonitorSmartphone, RefreshCw, ShieldX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { getVideoServerHistory, logoutVideoServer } from "@/lib/api/client";
import type { DeviceSession } from "@/lib/api/types";

interface DeviceSessionPanelProps {
  token: string;
}

type ActionState = "idle" | "loading" | "refresh" | "video";

interface SessionGroup {
  title: string;
  description: string;
  sessions: DeviceSession[];
}

function sessionTitle(session: DeviceSession) {
  return session.device_name || session.device_client || session.device_id || "未知设备";
}

function sessionMeta(session: DeviceSession) {
  return [session.device_client, session.device_version, session.last_used_at].filter(Boolean).join(" · ") || "无更多设备信息";
}

function SessionList({ group, onLogout, action }: { group: SessionGroup; onLogout: (deviceId: string | null) => void; action: ActionState }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/15 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{group.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{group.description}</div>
        </div>
        <button type="button" onClick={() => onLogout(null)} disabled={action === "video"} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
          <ShieldX className="h-3.5 w-3.5" />
          全部登出
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {group.sessions.length ? (
          group.sessions.map((session, index) => {
            const deviceId = session.device_id ?? null;

            return (
              <div key={deviceId ?? index} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/45 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{sessionTitle(session)}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{sessionMeta(session)}</div>
                </div>
                <button type="button" onClick={() => onLogout(deviceId)} disabled={action === "video"} className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-border/70 px-3 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
                  登出
                </button>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-xs text-muted-foreground">暂无登录设备记录</div>
        )}
      </div>
    </div>
  );
}

export function DeviceSessionPanel({ token }: DeviceSessionPanelProps) {
  const [videoSessions, setVideoSessions] = useState<DeviceSession[]>([]);
  const [action, setAction] = useState<ActionState>("loading");
  const [message, setMessage] = useState("");

  const applySessions = useCallback(async () => {
    setAction("loading");
    setMessage("");

    try {
      const video = await getVideoServerHistory(token);
      setVideoSessions(video);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录设备加载失败");
    } finally {
      setAction("idle");
    }
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void applySessions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [applySessions]);

  function handleRefresh() {
    setAction("refresh");
    void applySessions();
  }

  function handleLogout(deviceId: string | null) {
    void (async () => {
      setAction("video");
      setMessage("");

      try {
        await logoutVideoServer({ device_id: deviceId }, token);
        await applySessions();
        setMessage(deviceId ? "指定设备已登出" : "全部设备已登出");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "设备登出失败");
      } finally {
        setAction("idle");
      }
    })();
  }

  const group: SessionGroup = {
    title: "视频服务器设备",
    description: "Emby/Jellyfin 等视频服务登录记录",
    sessions: videoSessions
  };

  return (
    <GlassPanel className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <MonitorSmartphone className="h-3.5 w-3.5" />
            Login Devices
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight">登录设备</h2>
          <p className="mt-1 text-sm text-muted-foreground">查看视频服务器登录记录，并支持登出单个或全部设备。</p>
        </div>
        <button type="button" onClick={handleRefresh} disabled={action === "loading" || action === "refresh"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50">
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      <div className="mt-5">
        <SessionList group={group} onLogout={handleLogout} action={action} />
      </div>

      {message ? <div className="mt-5 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{message}</div> : null}
    </GlassPanel>
  );
}
