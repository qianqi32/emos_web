"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserConsoleProvider } from "@/components/dashboard/user-console-context";
import { getUser } from "@/lib/api/client";
import { clearStoredToken, getStoredToken } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/api/types";

interface UserConsoleLayoutProps {
  children: React.ReactNode;
}

export function UserConsoleLayout({ children }: UserConsoleLayoutProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        router.replace("/");
        return;
      }

      setToken(storedToken);

      try {
        const profile = await getUser(storedToken);

        if (!isMounted) {
          return;
        }

        setUser(profile);
        setStatus("ready");
      } catch {
        if (!isMounted) {
          return;
        }

        clearStoredToken();
        router.replace("/");
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleLogout() {
    clearStoredToken();
    setToken("");
    setUser(null);
    router.replace("/");
  }

  if (status === "checking" || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[1600px] items-center justify-center">
        <div className="rounded-full border border-border/60 bg-background/55 px-5 py-3 text-sm text-muted-foreground shadow-glass backdrop-blur-xl">正在校验登录状态...</div>
      </div>
    );
  }

  return (
    <UserConsoleProvider value={{ token, user, setUser, logout: handleLogout }}>
      <DashboardShell user={user} onLogout={handleLogout}>
        {children}
      </DashboardShell>
    </UserConsoleProvider>
  );
}
