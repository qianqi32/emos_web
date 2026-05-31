import type { ReactNode } from "react";
import { CornerPlus } from "@/components/ui/corner-plus";
import { UserConsoleLayout } from "@/components/dashboard/user-console-layout";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-3 py-8 sm:px-6 lg:px-12 lg:py-14">
      <CornerPlus className="fixed left-4 top-4 h-6 w-6 md:left-8 md:top-8" />
      <CornerPlus className="fixed right-4 top-4 h-6 w-6 md:right-8 md:top-8" />
      <CornerPlus className="fixed bottom-4 left-4 h-6 w-6 md:bottom-8 md:left-8" />
      <CornerPlus className="fixed bottom-4 right-4 h-6 w-6 md:bottom-8 md:right-8" />
      <UserConsoleLayout>{children}</UserConsoleLayout>
    </main>
  );
}
