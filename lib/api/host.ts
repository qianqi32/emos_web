const API_HOST_STORAGE_KEY = "emos-api-host";
export const DEFAULT_API_HOST = "https://api.emos.best";

export function normalizeApiHost(value: string) {
  return value.trim().replace(/\/$/, "");
}

export function getStoredApiHost() {
  if (typeof window === "undefined") {
    return DEFAULT_API_HOST;
  }

  return normalizeApiHost(window.localStorage.getItem(API_HOST_STORAGE_KEY) || DEFAULT_API_HOST);
}

export function setStoredApiHost(host: string) {
  window.localStorage.setItem(API_HOST_STORAGE_KEY, normalizeApiHost(host));
}
