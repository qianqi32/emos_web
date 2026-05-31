import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse, PaginatedResponse } from "@/lib/api/types";

export interface VideoListParams extends QueryParams {
  tmdb_id?: string;
  todb_id?: string;
  video_id?: string;
  type?: string;
  title?: string;
  only_delete?: boolean;
  with_media?: boolean;
  page?: number;
  page_size?: number;
}

export interface VideoTreeParams extends QueryParams {
  type?: string;
  title?: string;
  tmdb_id?: string;
  todb_id?: string;
  video_id?: string;
}

export interface VideoIdParams extends QueryParams {
  video_id_type: string;
  video_id_value: string;
  season_number?: string;
  episode_number?: string;
}

export interface VideoSyncParams extends QueryParams {
  tmdb_id?: string;
  todb_id?: string;
}

export interface VideoEpisodeParams extends QueryParams {
  season_number?: string;
}

export function syncVideo(params?: VideoSyncParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/sync", params), token, jsonRequestInit("PATCH"));
}

export function getVideoTree(params?: VideoTreeParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/tree", params), token);
}

export function getVideoId(params: VideoIdParams, token?: string) {
  return requestJson<ApiEntity>(buildApiPath("/api/emos/api/video/getVideoId", params), token);
}

export function getVideoList(params?: VideoListParams, token?: string) {
  return requestJson<PaginatedResponse>(buildApiPath("/api/emos/api/video/list", params), token);
}

export function toggleVideoDelete(videoId: string, token?: string) {
  return requestJson<MutationResponse>(`/api/emos/api/video/${encodeURIComponent(videoId)}/delete`, token, { method: "PUT" });
}

export function getVideoSeasons(videoId: string, token?: string) {
  return requestJson<ApiEntity[]>(`/api/emos/api/video/${encodeURIComponent(videoId)}/season`, token);
}

export function getVideoEpisodes(videoId: string, params?: VideoEpisodeParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath(`/api/emos/api/video/${encodeURIComponent(videoId)}/episode`, params), token);
}
