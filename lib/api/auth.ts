import { requestJson } from "@/lib/api/request";
import type { SignCheckResponse } from "@/lib/api/types";

const EMOS_PUBLIC_BASE_URL = "https://api.emos.best";

function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createAuthLink() {
  const url = new URL("/link", EMOS_PUBLIC_BASE_URL);
  url.searchParams.set("uuid", createUuid());
  url.searchParams.set("name", "EMOS Control Console");
  url.searchParams.set("url", window.location.href);
  return url.toString();
}

export function checkSign(token?: string) {
  return requestJson<SignCheckResponse>("/api/emos/api/sign/check", token);
}
