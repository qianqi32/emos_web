"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerPlus } from "@/components/ui/corner-plus";
import { LandingView } from "@/components/landing-view";
import { checkSign, createAuthLink, getUser } from "@/lib/api/client";
import { clearStoredToken, getStoredToken, readOAuthCallback, setStoredToken } from "@/lib/auth/session";

export default function Home() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "loading" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const callbackToken = readOAuthCallback();
      const storedToken = callbackToken || getStoredToken();

      if (storedToken) {
        setToken(storedToken);
      } else {
        setStatus("idle");
        return;
      }

      if (callbackToken) {
        setStoredToken(callbackToken);
      }

      try {
        await getUser(storedToken);

        if (!isMounted) {
          return;
        }

        router.replace("/user");
      } catch {
        if (!isMounted) {
          return;
        }

        clearStoredToken();
        setToken("");
        setStatus("idle");
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleTokenLogin() {
    const nextToken = token.trim();

    if (!nextToken) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await checkSign(nextToken);
      await getUser(nextToken);
      setStoredToken(nextToken);
      setToken(nextToken);
      router.replace("/user");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "登录验证失败");
    }
  }

  function handleAuthLogin() {
    window.location.href = createAuthLink();
  }

  return (
    <main className="min-h-screen px-3 py-8 sm:px-6 lg:px-12 lg:py-14">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 md:bottom-8 md:right-8" />

      <LandingView token={token} status={status === "checking" ? "loading" : status} message={message} onTokenChange={setToken} onTokenLogin={handleTokenLogin} onAuthLogin={handleAuthLogin} />
    </main>
  );
}
