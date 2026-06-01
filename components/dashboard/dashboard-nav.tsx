"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Loader2, Repeat2, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { getUser } from "@/lib/api/client";
import { AppTopBar } from "@/components/app-top-bar";
import { useUserConsole } from "@/components/dashboard/user-console-context";
import { ToolDialog } from "@/components/dashboard/tools/tool-dialog";
import { getStoredAccounts, removeStoredAccount, saveStoredAccount } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/api/types";

const navItems = [
  { label: "仪表盘", href: "/user" },
  { label: "媒体管理", href: "/user/media" },
  { label: "上传视频", href: "/user/upload" },
  { label: "反代管理", href: "/user/proxy" },
  { label: "片单管理", href: "/user/watchlist" },
  { label: "求片管理", href: "/user/seek" },
  { label: "商城管理", href: "/user/shop" },
  { label: "充值管理", href: "/user/wallet" },
  { label: "社区管理", href: "/user/community" }
];

interface DashboardNavProps {
  user: UserProfile;
  onLogout: () => void;
  onClose?: () => void;
  mobile?: boolean;
}

function isActivePath(pathname: string, href: string) {
  return href === "/user" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function AccountAvatar({ avatar, username, active }: { avatar?: string | null; username: string; active: boolean }) {
  const initial = username.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <span
      className={active ? "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background text-sm font-semibold text-foreground shadow-sm" : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-muted/25 text-sm font-semibold text-muted-foreground"}
      style={avatar ? { backgroundImage: `url(${avatar})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
    >
      {avatar ? null : initial}
    </span>
  );
}

export function DashboardNav({ user, onLogout, onClose, mobile = false }: DashboardNavProps) {
  const pathname = usePathname();
  const { token, switchAccount } = useUserConsole();
  const [accountOpen, setAccountOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [accounts, setAccounts] = useState(() => getStoredAccounts());
  const [tokenInput, setTokenInput] = useState("");
  const [switchStatus, setSwitchStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function handleNavigate() {
    setAccountOpen(false);
    onClose?.();
  }

  function handleLogout() {
    setAccountOpen(false);
    onLogout();
  }

  function openSwitchDialog() {
    saveStoredAccount({ token, user_id: user.user_id, username: user.username, avatar: user.avatar });
    setAccounts(getStoredAccounts());
    setMessage("");
    setAccountOpen(false);
    setSwitchOpen(true);
  }

  async function addAccount() {
    const nextToken = tokenInput.trim();

    if (!nextToken) {
      setMessage("请输入 token");
      return;
    }

    setSwitchStatus("adding");
    setMessage("");

    try {
      const profile = await getUser(nextToken);
      saveStoredAccount({ token: nextToken, user_id: profile.user_id, username: profile.username, avatar: profile.avatar });
      setAccounts(getStoredAccounts());
      setTokenInput("");
      setMessage(`已添加账号 ${profile.username}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账号添加失败");
    } finally {
      setSwitchStatus("idle");
    }
  }

  async function selectAccount(nextToken: string) {
    setSwitchStatus(nextToken);
    setMessage("");

    try {
      const profile = await getUser(nextToken);
      saveStoredAccount({ token: nextToken, user_id: profile.user_id, username: profile.username, avatar: profile.avatar });
      switchAccount(nextToken, profile);
      setAccounts(getStoredAccounts());
      setSwitchOpen(false);
      onClose?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "账号切换失败");
    } finally {
      setSwitchStatus("idle");
    }
  }

  function deleteAccount(accountToken: string) {
    removeStoredAccount(accountToken);
    setAccounts(getStoredAccounts());
  }

  return (
    <div className={mobile ? "flex max-h-[82vh] flex-col" : "flex h-full flex-col"}>
      <div className="flex items-center justify-between gap-3">
        <AppTopBar compact />
        {onClose ? (
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 lg:hidden">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {mobile ? (
        <div className="mt-5 h-1.5 w-12 self-center rounded-full bg-border/80" />
      ) : null}
      <div className={mobile ? "mt-5 grid grid-cols-2 gap-2" : "mt-8 space-y-1"}>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavigate}
              className={active ? "flex h-11 w-full items-center justify-center rounded-full bg-foreground px-4 text-sm font-semibold text-background lg:h-10 lg:justify-start" : "flex h-11 w-full items-center justify-center rounded-full border border-border/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground lg:h-10 lg:justify-start lg:border-transparent"}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className={mobile ? "relative mt-5" : "relative mt-auto pt-8"}>
        {accountOpen ? (
          <div className="absolute bottom-[calc(100%+0.75rem)] left-0 right-0 z-20 rounded-3xl border border-border/70 bg-background/95 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <Link href="/user/profile" onClick={handleNavigate} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted/45">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              用户信息
            </Link>
            <button type="button" onClick={openSwitchDialog} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted/45">
              <Repeat2 className="h-4 w-4 text-muted-foreground" />
              切换账号
            </button>
            <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10">
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        ) : null}
        <button type="button" onClick={() => setAccountOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/35">
          <span className="min-w-0">
            <span className="block truncate font-mono text-sm font-semibold">{user.user_id}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{user.username}</span>
          </span>
          <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </div>

      <ToolDialog open={switchOpen} title="切换账号" maxWidthClassName="max-w-xl" onClose={() => setSwitchOpen(false)}>
        <div className="space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">账号列表</div>
                <div className="mt-1 text-xs text-muted-foreground">选择一个已保存账号切换当前会话</div>
              </div>
              <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">{accounts.length} 个账号</div>
            </div>
            <div className="space-y-2">
              {accounts.length > 0 ? accounts.map((account) => {
                const active = account.token === token;
                const loading = switchStatus === account.token;

                return (
                  <div key={account.token} className={active ? "rounded-3xl border border-border/70 bg-muted/25 p-3 shadow-glass" : "rounded-3xl border border-border/55 bg-background/35 p-3 transition-colors hover:bg-muted/20"}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <AccountAvatar avatar={account.avatar} username={account.username} active={active} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">{account.username}</span>
                            {active ? <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">当前账号</span> : null}
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{account.user_id}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:justify-end">
                        <button type="button" onClick={() => void selectAccount(account.token)} disabled={active || switchStatus !== "idle"} className="inline-flex h-9 min-w-20 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-55">
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                          {active ? "已启用" : "切换"}
                        </button>
                        {!active ? (
                          <button type="button" onClick={() => deleteAccount(account.token)} disabled={switchStatus !== "idle"} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border/70 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50">
                            <Trash2 className="h-4 w-4" />
                            删除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              }) : <div className="rounded-3xl border border-border/60 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">暂无已保存账号。</div>}
            </div>
          </section>

          <div className="h-px bg-border/70" />

          <section className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-foreground">添加新账号</div>
              <div className="mt-1 text-xs text-muted-foreground">粘贴 EMOS Token，校验成功后会加入账号列表。</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="请输入 Token" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <button type="button" onClick={() => void addAccount()} disabled={switchStatus !== "idle"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                {switchStatus === "adding" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                添加账号
              </button>
            </div>
          </section>
          {message ? <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">{message}</div> : null}
        </div>
      </ToolDialog>
    </div>
  );
}
