import { getStoredApiHost } from "@/lib/api/host";

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

export async function requestJson<T>(path: string, token?: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  headers.set("x-emos-api-host", getStoredApiHost());

  if (token) {
    headers.set("authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include"
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    let message = "";

    if (raw) {
      try {
        const payload = JSON.parse(raw) as { message?: string };
        message = payload?.message ?? "";
      } catch {
        message = raw.slice(0, 200);
      }
    }

    throw new Error(message || `请求失败：${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
