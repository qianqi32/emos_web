"use client";

import { CalendarCheck, CheckCircle2, Gift, Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { ToolDialog } from "@/components/dashboard/tools/tool-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { getRankSign, getUser, signIn } from "@/lib/api/client";
import type { RankSignItem, UserProfile } from "@/lib/api/types";

interface SignInCardProps {
  token: string;
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
}

function formatApiDateTime(value: string) {
  return value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").slice(0, 16);
}

export function SignInCard({ token, user, onUserChange }: SignInCardProps) {
  const [signContent, setSignContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [rankOpen, setRankOpen] = useState(false);
  const [rankStatus, setRankStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [rankItems, setRankItems] = useState<RankSignItem[]>([]);
  const [rankMessage, setRankMessage] = useState("");

  async function handleSignIn() {
    const content = signContent.trim();

    if (!content) {
      setMessage("请输入签到内容");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await signIn(content, token);
      const nextUser = await getUser(token);
      onUserChange(nextUser);
      setSignContent("");
      setMessage(`签到成功，获得 ${result.earn_point} 萝卜，连续 ${result.continuous_days} 天`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "签到失败");
    } finally {
      setLoading(false);
    }
  }

  async function openRank() {
    setRankOpen(true);

    if (rankStatus === "ready" || rankStatus === "loading") {
      return;
    }

    setRankStatus("loading");
    setRankMessage("");

    try {
      const items = await getRankSign(token);
      setRankItems(items);
      setRankStatus("ready");
    } catch (error) {
      setRankMessage(error instanceof Error ? error.message : "签到榜加载失败");
      setRankStatus("error");
    }
  }

  const signed = Boolean(user.sign);

  return (
    <>
      <GlassPanel className="overflow-hidden bg-background p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarCheck className="h-4 w-4" />
            </span>
            每日签到
          </div>
          <button type="button" onClick={openRank} className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-muted/15 text-primary transition-colors hover:bg-muted/35" aria-label="查看签到榜">
            <Trophy className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-7 flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-warning/15">
            <div className="absolute inset-2 rounded-full border-2 border-warning/35" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-warning text-white shadow-[0_14px_35px_hsl(var(--warning)/0.28)]">
              <Gift className="h-7 w-7" />
            </div>
          </div>

          <h2 className="mt-5 text-xl font-bold tracking-tight">{signed ? "今日已签到" : "今日还未签到"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {user.sign ? (
              <>获得 <span className="font-semibold text-warning">{user.sign.earn_point ?? 0}</span> 萝卜 · 连续 <span className="font-semibold text-warning">{user.sign.continuous_days ?? 0}</span> 天</>
            ) : (
              <>签到后刷新萝卜余额，保持连续天数。</>
            )}
          </p>
        </div>

        {signed ? (
          <div className="mt-7 flex justify-center">
            <button type="button" disabled className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-muted-foreground px-6 text-sm font-bold text-background disabled:cursor-not-allowed sm:max-w-72">
              <CheckCircle2 className="h-4 w-4" />
              已签到
            </button>
          </div>
        ) : (
          <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <input value={signContent} onChange={(event) => setSignContent(event.target.value)} placeholder="随便说点什么" disabled={loading} className="h-12 w-full rounded-2xl border border-border/70 bg-muted/20 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:bg-background focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70" />
            <button type="button" onClick={handleSignIn} disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-bold text-background shadow-[0_14px_35px_hsl(var(--foreground)/0.12)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {loading ? "签到中..." : "立即签到"}
            </button>
          </div>
        )}

        {message ? <div className="mt-4 rounded-2xl border border-info/20 bg-info/10 px-4 py-3 text-sm text-info">{message}</div> : null}
      </GlassPanel>

      <ToolDialog open={rankOpen} title="签到榜" description="今日签到排行，让我看看谁在卡点" maxWidthClassName="max-w-2xl" onClose={() => setRankOpen(false)}>
        {rankStatus === "loading" ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载签到榜...
          </div>
        ) : null}

        {rankStatus === "error" ? <EmptyState title="签到榜加载失败" description={rankMessage || "稍后再试，或刷新页面后重新打开。"} /> : null}

        {rankStatus === "ready" && rankItems.length === 0 ? <EmptyState title="暂无签到记录" description="今天还没有人上榜，先签到的人会出现在这里。" /> : null}

        {rankStatus === "ready" && rankItems.length > 0 ? (
          <div className="space-y-3">
            {rankItems.map((item, index) => (
              <div key={`${item.username}-${item.sign_index}-${item.sign_at}`} className="grid gap-3 rounded-3xl border border-border/60 bg-muted/15 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-sm font-bold shadow-sm">#{index + 1}</div>
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                    {item.avatar ? <span role="img" aria-label={item.username} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${item.avatar})` }} /> : item.username.slice(0, 1).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold">{item.username}</div>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">+{item.earn_point} 萝卜</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">连续 {item.continuous_days} 天</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.sign_content || "今天也稳定签到"}</p>
                </div>
                <div className="text-left text-xs text-muted-foreground sm:text-right">
                  <div className="font-mono text-foreground">第 {item.sign_index} 位</div>
                  <div className="mt-1">{formatApiDateTime(item.sign_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </ToolDialog>
    </>
  );
}
