import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { CarrotMutationResponse, VideoSubtitleItem } from "@/lib/api/types";

export interface SubtitleListParams extends QueryParams {
  video_list_id?: string;
  video_episode_id?: string;
  video_part_id?: string;
  media_id?: string;
}

export interface SubtitleDeletePayload {
  subtitle_id: string;
  reason?: string | null;
}

export interface SubtitleRenameParams extends QueryParams {
  subtitle_id: string;
  title: string;
}

export function getSubtitleList(params?: SubtitleListParams, token?: string) {
  return requestJson<VideoSubtitleItem[]>(buildApiPath("/api/emos/api/video/subtitle/list", params), token);
}

export function deleteSubtitle(data: SubtitleDeletePayload, token?: string) {
  return requestJson<CarrotMutationResponse>("/api/emos/api/video/subtitle/delete", token, jsonRequestInit("DELETE", data));
}

export function renameSubtitle(params: SubtitleRenameParams, token?: string) {
  return requestJson<CarrotMutationResponse>(buildApiPath("/api/emos/api/video/subtitle/rename", params), token, { method: "PUT" });
}
