import { jsonRequestInit, requestJson } from "@/lib/api/request";
import type { RedPacketCreateResponse, RedPacketReceiveResponse } from "@/lib/api/types";

export interface RedPacketCreatePayload {
  type: "default" | "password";
  receive: "average" | "random";
  carrot: number;
  number: number;
  blessing: string;
  text: string | null;
  file_url: string | null;
  file_type: string | null;
  is_exclusive: boolean;
  seconds: number;
}

export function createRedPacket(data: RedPacketCreatePayload, token?: string) {
  return requestJson<RedPacketCreateResponse>("/api/emos/api/redPacket/create", token, jsonRequestInit("POST", data));
}

export function getRedPacketReceive(redPacketId: string, token?: string) {
  return requestJson<RedPacketReceiveResponse>(`/api/emos/api/redPacket/receive?red_packet_id=${encodeURIComponent(redPacketId)}`, token);
}
