"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Repeat2, UserRound, X } from "lucide-react";
import { useState } from "react";
import { AppTopBar } from "@/components/app-top-bar";
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

export function DashboardNav({ user, onLogout, onClose, mobile = false }: DashboardNavProps) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);

  function handleNavigate() {
    setAccountOpen(false);
    onClose?.();
  }

  function handleLogout() {
    setAccountOpen(false);
    onLogout();
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
            <button type="button" onClick={handleLogout} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-medium transition-colors hover:bg-muted/45">
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
    </div>
  );
}
