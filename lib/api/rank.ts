import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type {
  CarrotHistoryResponse,
  TransferCarrotResponse,
  RankCarrotItem,
  RankPlayingItem,
  RankSignItem,
  RankUploadItem,
} from "@/lib/api/types";

export interface CarrotHistoryParams extends QueryParams {
  type?: "earn" | "cost";
  user_id?: string;
}

export interface TransferCarrotPayload {
  user_id: string;
  carrot: number;
}

export function getRankCarrot(token?: string) {
  return requestJson<RankCarrotItem[]>("/api/emos/api/rank/carrot", token);
}

export function getRankUpload(token?: string) {
  return requestJson<RankUploadItem[]>("/api/emos/api/rank/upload", token);
}

export function getRankPlaying(token?: string) {
  return requestJson<RankPlayingItem[]>("/api/emos/api/rank/userVideoRecordPlaying", token);
}

export function getRankSign(token?: string) {
  return requestJson<RankSignItem[]>("/api/emos/api/rank/sign", token);
}

export function getCarrotHistory(params?: CarrotHistoryParams, token?: string) {
  return requestJson<CarrotHistoryResponse>(buildApiPath("/api/emos/api/carrot/history", params), token);
}

export function transferCarrot(data: TransferCarrotPayload, token?: string) {
  return requestJson<TransferCarrotResponse>("/api/emos/api/carrot/transfer", token, jsonRequestInit("PUT", data));
}
