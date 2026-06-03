import { jsonRequestInit, requestJson } from "@/lib/api/request";
import type { RecordListItem } from "@/lib/api/types";

export interface TraktTokens {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
}

export interface TraktDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TraktTokenResponse extends TraktTokens {
  expires_in?: number;
}

export interface TraktWeeklyResponse {
  range: string;
  episode_count: number;
  movie_count: number;
  total_minutes: number;
  shows: Array<{ title: string; count: number; minutes: number }>;
  movies: Array<{ title: string; minutes: number }>;
  ai_review?: string;
  tokens?: TraktTokens;
}

export interface TraktCalendarItem {
  show_title: string;
  episode_title: string;
  episode_number: string;
  first_aired: string;
}

export function getTraktDeviceCode() {
  return requestJson<TraktDeviceCodeResponse>("/api/trakt", undefined, jsonRequestInit("POST", { action: "device-code" }));
}

export function getTraktToken(deviceCode: string) {
  return requestJson<TraktTokenResponse>("/api/trakt", undefined, jsonRequestInit("POST", { action: "token", device_code: deviceCode }));
}

export function refreshTraktToken(refreshToken: string) {
  return requestJson<TraktTokenResponse>("/api/trakt", undefined, jsonRequestInit("POST", { action: "refresh", refresh_token: refreshToken }));
}

export function syncTraktHistory(tokens: TraktTokens, records: RecordListItem[]) {
  return requestJson<{ synced: number; tokens?: TraktTokens }>("/api/trakt", undefined, jsonRequestInit("POST", { action: "sync", tokens, records }));
}

export function getTraktWeekly(tokens: TraktTokens, withAi: boolean) {
  return requestJson<TraktWeeklyResponse>("/api/trakt", undefined, jsonRequestInit("POST", { action: "weekly", tokens, with_ai: withAi }));
}

export function getTraktCalendar(tokens: TraktTokens) {
  return requestJson<{ items: TraktCalendarItem[]; tokens?: TraktTokens }>("/api/trakt", undefined, jsonRequestInit("POST", { action: "calendar", tokens }));
}
