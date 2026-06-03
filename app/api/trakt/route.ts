import { NextRequest } from "next/server";
import type { RecordListItem } from "@/lib/api/types";

const TRAKT_API = "https://api.trakt.tv";

interface TraktTokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
}

interface TraktError extends Error {
  status?: number;
  payload?: unknown;
}

interface TraktHistoryItem {
  type?: string;
  show?: { title?: string; runtime?: number };
  episode?: { runtime?: number };
  movie?: { title?: string; runtime?: number };
}

interface TraktCalendarResponseItem {
  first_aired?: string;
  show?: { title?: string };
  episode?: { title?: string; season?: number; number?: number };
}

interface TraktEpisodePayload {
  number: number;
  watched_at?: string;
}

interface TraktSyncPayload {
  movies: Array<{ ids: { tmdb: number }; watched_at?: string }>;
  shows: Array<{
    ids: { tmdb: number };
    seasons: Array<{ number: number; episodes: TraktEpisodePayload[] }>;
  }>;
}

function getClientId() {
  return process.env.TRAKT_CLIENT_ID || "";
}

function getClientSecret() {
  return process.env.TRAKT_CLIENT_SECRET || "";
}

function ensureClientId() {
  if (!getClientId()) {
    throw Object.assign(new Error("网站未配置 Trakt Client ID，请先设置 TRAKT_CLIENT_ID"), { status: 503 });
  }
}

function ensureClientSecret() {
  if (!getClientSecret()) {
    throw Object.assign(new Error("网站未配置 Trakt Client Secret，请先设置 TRAKT_CLIENT_SECRET"), { status: 503 });
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function readJson(request: NextRequest) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function traktRequest<T>(path: string, init: RequestInit = {}, accessToken?: string) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("trakt-api-version", "2");
  headers.set("trakt-api-key", getClientId());
  headers.set("user-agent", "EMOS-Web/1.0");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${TRAKT_API}${path}`, { ...init, headers });
  const text = await response.text();
  let payload: T | string | undefined;

  try {
    payload = text ? JSON.parse(text) as T : undefined;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const error = new Error(response.status === 401 ? "Trakt 授权已过期，请刷新或重新绑定" : "Trakt 请求失败") as TraktError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (typeof payload === "string") {
    const error = new Error("Trakt 返回了非 JSON 响应，请检查 Client ID/Secret 是否正确，或稍后重试") as TraktError;
    error.status = 502;
    error.payload = payload.slice(0, 300);
    throw error;
  }

  return payload as T;
}

async function refreshTokens(refreshToken: string): Promise<TraktTokens> {
  ensureClientSecret();

  const result = await traktRequest<{ access_token: string; refresh_token?: string; expires_in?: number }>("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
      grant_type: "refresh_token"
    })
  });

  return {
    access_token: result.access_token,
    refresh_token: result.refresh_token || refreshToken,
    expires_at: Date.now() + (result.expires_in || 7200) * 1000
  };
}

async function authedRequest<T>(path: string, tokens: TraktTokens, init?: RequestInit) {
  try {
    return { data: await traktRequest<T>(path, init, tokens.access_token), tokens };
  } catch (error) {
    const traktError = error as TraktError;
    if (traktError.status !== 401 || !tokens.refresh_token) throw error;
    const refreshed = await refreshTokens(tokens.refresh_token);
    return { data: await traktRequest<T>(path, init, refreshed.access_token), tokens: refreshed };
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function weeklyRange() {
  const now = new Date();
  const bjToday = new Date(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now));
  const day = bjToday.getDay();
  const daysToLastMonday = day === 0 ? 6 : day + 6;
  const lastMonday = new Date(bjToday.getTime() - daysToLastMonday * 86400000);
  const thisMonday = new Date(lastMonday.getTime() + 7 * 86400000);
  const lastSundayEnd = new Date(thisMonday.getTime() - 1);
  const range = `${pad(lastMonday.getMonth() + 1)}-${pad(lastMonday.getDate())} ~ ${pad(lastSundayEnd.getMonth() + 1)}-${pad(lastSundayEnd.getDate())}`;
  return { start: lastMonday.toISOString(), end: lastSundayEnd.toISOString(), range };
}

function getRecordWatchedAt(record: RecordListItem) {
  if (!record.time) return undefined;
  const date = new Date(record.time.replace(" ", "T") + "+08:00");
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildSyncPayload(records: RecordListItem[]) {
  const payload: TraktSyncPayload = { movies: [], shows: [] };
  const showMap = new Map<number, Map<number, TraktEpisodePayload[]>>();
  let count = 0;

  records.forEach((record) => {
    if (!record.is_complete || !record.tmdb_id) return;

    const watchedAt = getRecordWatchedAt(record);

    if (record.video_type === "movie") {
      payload.movies.push({ ids: { tmdb: record.tmdb_id }, watched_at: watchedAt });
      count += 1;
      return;
    }

    if (record.video_type === "tv" && record.season_number && record.episode_number) {
      const seasonMap = showMap.get(record.tmdb_id) || new Map<number, TraktEpisodePayload[]>();
      const episodes = seasonMap.get(record.season_number) || [];
      episodes.push({ number: record.episode_number, watched_at: watchedAt });
      seasonMap.set(record.season_number, episodes);
      showMap.set(record.tmdb_id, seasonMap);
      count += 1;
    }
  });

  showMap.forEach((seasonMap, tmdbId) => {
    payload.shows.push({
      ids: { tmdb: tmdbId },
      seasons: [...seasonMap.entries()].map(([season, episodes]) => ({ number: season, episodes }))
    });
  });

  return { payload, count };
}

async function generateAiReview(titles: string[]) {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey || titles.length === 0) return "";

  const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: "你是幽默且懂影视的私人影评人。根据用户上周观看的影视剧，用中文写一段 60 字以内的观影辣评。不要标题，不要提字数。" },
        { role: "user", content: titles.join("、") }
      ],
      temperature: 0.8,
      max_tokens: 120
    })
  });

  if (!response.ok) return "";
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    ensureClientId();
    const body = await readJson(request);
    const action = String(body.action || "");

    if (action === "device-code") {
      return json(await traktRequest("/oauth/device/code", {
        method: "POST",
        body: JSON.stringify({ client_id: getClientId() })
      }));
    }

    if (action === "token") {
      ensureClientSecret();
      const deviceCode = String(body.device_code || "");
      return json(await traktRequest("/oauth/device/token", {
        method: "POST",
        body: JSON.stringify({ code: deviceCode, client_id: getClientId(), client_secret: getClientSecret() })
      }));
    }

    if (action === "refresh") {
      ensureClientSecret();
      return json(await refreshTokens(String(body.refresh_token || "")));
    }

    const tokens = body.tokens as TraktTokens | undefined;
    if (!tokens?.access_token) return json({ message: "缺少 Trakt 授权" }, 400);

    if (action === "sync") {
      const records = Array.isArray(body.records) ? body.records as RecordListItem[] : [];
      const { payload, count } = buildSyncPayload(records);
      const result = await authedRequest("/sync/history", tokens, { method: "POST", body: JSON.stringify(payload) });
      return json({ synced: count, tokens: result.tokens });
    }

    if (action === "weekly") {
      const range = weeklyRange();
      const result = await authedRequest<TraktHistoryItem[]>(`/sync/history?limit=1000&start_at=${encodeURIComponent(range.start)}&end_at=${encodeURIComponent(range.end)}&extended=full`, tokens);
      const shows = new Map<string, { title: string; count: number; minutes: number }>();
      const movies = new Map<string, { title: string; minutes: number }>();
      let episodeCount = 0;
      let totalMinutes = 0;

      result.data.forEach((item) => {
        if (item.type === "episode" && item.show) {
          const title = item.show.title || "未知剧集";
          const runtime = Number(item.episode?.runtime || item.show?.runtime || 0);
          const current = shows.get(title) || { title, count: 0, minutes: 0 };
          current.count += 1;
          current.minutes += runtime;
          shows.set(title, current);
          episodeCount += 1;
          totalMinutes += runtime;
        } else if (item.type === "movie" && item.movie) {
          const title = item.movie.title || "未知电影";
          const runtime = Number(item.movie.runtime || 0);
          if (!movies.has(title)) movies.set(title, { title, minutes: runtime });
          totalMinutes += runtime;
        }
      });

      const titles = [...shows.values()].map((item) => item.title).concat([...movies.values()].map((item) => item.title));
      const aiReview = body.with_ai ? await generateAiReview(titles) : "";
      return json({ range: range.range, episode_count: episodeCount, movie_count: movies.size, total_minutes: totalMinutes, shows: [...shows.values()], movies: [...movies.values()], ai_review: aiReview, tokens: result.tokens });
    }

    if (action === "calendar") {
      const result = await authedRequest<TraktCalendarResponseItem[]>("/calendars/my/shows/7?extended=full", tokens);
      const items = result.data.map((item) => ({
        show_title: item.show?.title || "未知剧集",
        episode_title: item.episode?.title || "未知标题",
        episode_number: `S${pad(Number(item.episode?.season || 0))}E${pad(Number(item.episode?.number || 0))}`,
        first_aired: String(item.first_aired || "")
      }));
      return json({ items, tokens: result.tokens });
    }

    return json({ message: "未知 Trakt 操作" }, 400);
  } catch (error) {
    const traktError = error as TraktError;
    return json({ message: traktError.message || "Trakt 请求失败", payload: traktError.payload }, traktError.status && traktError.status >= 400 ? traktError.status : 500);
  }
}
