"use client";

import { UserPage } from "@/components/dashboard/user-page";
import { useUserConsole } from "@/components/dashboard/user-console-context";

export default function ProfilePage() {
  const { token, user, setUser } = useUserConsole();

  return <UserPage token={token} user={user} onUserChange={setUser} />;
}
