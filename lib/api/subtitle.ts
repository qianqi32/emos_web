import { buildApiPath, type QueryParams, requestJson } from "@/lib/api/request";
import type { ApiEntity, MutationResponse } from "@/lib/api/types";

export interface SubtitleListParams extends QueryParams {
  video_list_id?: string;
  video_episode_id?: string;
  video_part_id?: string;
  video_media_id?: string;
}

export interface SubtitleRenameParams extends QueryParams {
  subtitle_id: string;
  title: string;
}

export function getSubtitleList(params?: SubtitleListParams, token?: string) {
  return requestJson<ApiEntity[]>(buildApiPath("/api/emos/api/video/subtitle/list", params), token);
}

export function deleteSubtitle(subtitleId: string, token?: string) {
  return requestJson<MutationResponse>(buildApiPath("/api/emos/api/video/subtitle/delete", { subtitle_id: subtitleId }), token, { method: "DELETE" });
}

export function renameSubtitle(params: SubtitleRenameParams, token?: string) {
  return requestJson<MutationResponse>(buildApiPath("/api/emos/api/video/subtitle/rename", params), token, { method: "PUT" });
}
