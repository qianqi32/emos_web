import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { SeekApplyResponse, SeekClaimResponse, SeekHistoryItem, SeekListResponse, SeekQueryResponse, SeekUrgeResponse } from "@/lib/api/types";

export interface SeekListPayload {
  page?: number;
  page_size?: number;
  video_type?: string | null;
  sort_by?: "count_request" | "seek_carrot" | "upload_expired_at" | "updated_at" | string;
  sort_order?: "asc" | "desc" | string;
  status?: string[];
  upload_self?: boolean;
  video_title?: string | null;
  with_user?: boolean;
}

export interface SeekPollParams extends QueryParams {
  last_id?: string;
  page_size?: number;
}

export interface SeekApplyParams extends QueryParams {
  item_type: string;
  item_id: string;
}

export interface SeekQueryParams extends QueryParams {
  seek_id: string;
}

export interface SeekHistoryParams extends QueryParams {
  seek_id?: string;
  video_list_id?: string;
  video_season_id?: string;
  video_episode_id?: string;
}

export interface SeekClaimPayload {
  seek_id: number;
  type: "confirm" | "cancel" | string;
}

export interface SeekUrgePayload {
  seek_id: number;
  carrot: number;
}

export function getSeekList(data: SeekListPayload, token?: string) {
  return requestJson<SeekListResponse>("/api/emos/api/seek", token, jsonRequestInit("POST", data));
}

export function getSeekPoll(params?: SeekPollParams, token?: string) {
  return requestJson<SeekListResponse>(buildApiPath("/api/emos/api/seek/poll", params), token);
}

export function applySeek(params: SeekApplyParams, token?: string) {
  return requestJson<SeekApplyResponse>(buildApiPath("/api/emos/api/seek/apply", params), token, { method: "PUT" });
}

export function querySeek(params: SeekQueryParams, token?: string) {
  return requestJson<SeekQueryResponse>(buildApiPath("/api/emos/api/seek/query", params), token);
}

export function getSeekHistory(params?: SeekHistoryParams, token?: string) {
  return requestJson<SeekHistoryItem[]>(buildApiPath("/api/emos/api/seek/history", params), token);
}

export function claimSeek(data: SeekClaimPayload, token?: string) {
  return requestJson<SeekClaimResponse>("/api/emos/api/seek/claim", token, jsonRequestInit("PUT", data));
}

export function urgeSeek(data: SeekUrgePayload, token?: string) {
  return requestJson<SeekUrgeResponse>("/api/emos/api/seek/urge", token, jsonRequestInit("PUT", data));
}
