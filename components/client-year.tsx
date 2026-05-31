"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
}

export function ClientYear({ placeholder = "2026" }: { placeholder?: string }) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return <>{placeholder}</>;
  }

  return <>{new Date().getFullYear()}</>;
}
