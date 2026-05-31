import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type { SaveSubtitleUploadResponse, SaveVideoUploadResponse, UploadTokenResponse, UploadVideoBaseResponse } from "@/lib/api/types";

export interface UploadVideoBaseParams extends QueryParams {
  item_type: string;
  item_id: string;
}

export interface SaveUploadPayload {
  item_type: string;
  item_id: number;
  file_id: string;
}

export interface UploadTokenPayload {
  type: "video" | "subtitle" | "image" | string;
  file_type: string;
  file_name: string;
  file_size: number;
  file_storage: "default" | "global" | "internal" | string;
}

export function getVideoBaseInfo(params: UploadVideoBaseParams, token?: string) {
  return requestJson<UploadVideoBaseResponse>(buildApiPath("/api/emos/api/upload/video/base", params), token);
}

export function saveVideoUpload(data: SaveUploadPayload, token?: string) {
  return requestJson<SaveVideoUploadResponse>("/api/emos/api/upload/video/save", token, jsonRequestInit("POST", data));
}

export function saveSubtitleUpload(data: SaveUploadPayload, token?: string) {
  return requestJson<SaveSubtitleUploadResponse>("/api/emos/api/upload/subtitle/save", token, jsonRequestInit("POST", data));
}

export function getUploadToken(data: UploadTokenPayload, token?: string) {
  return requestJson<UploadTokenResponse>("/api/emos/api/upload/getUploadToken", token, jsonRequestInit("POST", data));
}
