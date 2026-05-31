"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/api/types";

interface UserConsoleContextValue {
  token: string;
  user: UserProfile;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

const UserConsoleContext = createContext<UserConsoleContextValue | null>(null);

export const UserConsoleProvider = UserConsoleContext.Provider;

export function useUserConsole() {
  const context = useContext(UserConsoleContext);

  if (!context) {
    throw new Error("useUserConsole must be used inside UserConsoleProvider");
  }

  return context;
}
