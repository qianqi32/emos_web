import { getStoredApiHost } from "@/lib/api/host";
import type { ApiErrorPayload } from "@/lib/api/types";

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export function buildApiPath(path: string, params?: QueryParams) {
  if (!params) {
    return path;
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];

    values.forEach((item) => {
      if (item !== null && item !== undefined) {
        searchParams.append(key, String(item));
      }
    });
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function jsonRequestInit(method: string, data?: unknown): RequestInit {
  const headers = new Headers();

  if (data !== undefined) {
    headers.set("content-type", "application/json");
  }

  return {
    method,
    headers,
    body: data !== undefined ? JSON.stringify(data) : undefined
  };
}

function extractApiErrorMessage(payload: ApiErrorPayload) {
  return payload.message ?? payload.error ?? payload.detail ?? "";
}

async function readErrorMessage(response: Response) {
  const raw = await response.text().catch(() => "");

  if (!raw) {
    return "";
  }

  try {
    const payload = JSON.parse(raw) as ApiErrorPayload;
    const message = extractApiErrorMessage(payload);
    return message ? String(message) : "";
  } catch {
    return raw.slice(0, 200);
  }
}

export async function requestJson<T>(path: string, token?: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  headers.set("x-emos-api-host", getStoredApiHost());

  if (token) {
    headers.set("authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include"
    });
  } catch (error) {
    throw error;
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);

    throw new Error(message || `请求失败：${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();

  if (!raw) {
    return undefined as T;
  }

  return JSON.parse(raw) as T;
}
