import type { ReactNode } from "react";
import { CornerPlus } from "@/components/ui/corner-plus";
import { AppFooter } from "@/components/app-footer";
import { UserConsoleLayout } from "@/components/dashboard/user-console-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col px-3 py-8 sm:px-6 lg:px-12 lg:py-14">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 md:bottom-8 md:right-8" />
      <div className="min-w-0 flex-1">
        <UserConsoleLayout>{children}</UserConsoleLayout>
      </div>
      <AppFooter />
    </main>
  );
}
