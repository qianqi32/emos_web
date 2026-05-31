import { requestJson } from "@/lib/api/request";
import type { SignCheckResponse } from "@/lib/api/types";

const EMOS_AUTH_BASE_URL = "https://emos.best";

function createUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createAuthLink() {
  const uuid = createUuid();
  const params = new URLSearchParams();

  params.set("name", "EMOS Control Console");
  params.set("url", window.location.href);

  return `${EMOS_AUTH_BASE_URL}/#/link/${uuid}?${params.toString()}`;
}

export function checkSign(token?: string) {
  return requestJson<SignCheckResponse>("/api/emos/api/sign/check", token);
}
