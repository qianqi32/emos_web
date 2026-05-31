import { buildApiPath, jsonRequestInit, type QueryParams, requestJson } from "@/lib/api/request";
import type {
  ShopCategory,
  ShopOrderCreateResponse,
  ShopOrderDeleteResponse,
  ShopOrderPayResponse,
  ShopOrderResponse,
  ShopOrderUrgeResponse,
  ShopProductInfo,
  ShopProductResponse,
  ShopSellerBase,
} from "@/lib/api/types";

export interface ShopSellerBaseParams extends QueryParams {
  seller_id?: number | string;
}

export interface ShopCategoryParams extends QueryParams {
  seller_id: number | string;
}

export interface ShopProductListParams extends QueryParams {
  seller_id?: number | string;
  category_id?: number | string;
  name?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc" | string;
  is_up?: string | number;
  page?: number;
  page_size?: number;
}

export interface ShopProductInfoParams extends QueryParams {
  product_id: number | string;
}

export interface ShopOrderListParams extends QueryParams {
  seller_id?: number | string;
  product_id?: number | string;
  order_title?: string;
  order_no?: string;
  is_pay?: string;
  is_delivery?: string;
  page?: number;
  page_size?: number;
}

export interface ShopOrderCreatePayload {
  product_id: number;
  buy_number: number;
  remark?: string | null;
}

export interface ShopOrderNoPayload {
  order_no: string;
}

export function getShopSellerBase(params?: ShopSellerBaseParams, token?: string) {
  return requestJson<ShopSellerBase>(buildApiPath("/api/emos/api/shop/seller/base", params), token);
}

export function getShopCategoryList(params: ShopCategoryParams, token?: string) {
  return requestJson<ShopCategory[]>(buildApiPath("/api/emos/api/shop/category/list", params), token);
}

export function getShopProductList(params: ShopProductListParams, token?: string) {
  return requestJson<ShopProductResponse>(buildApiPath("/api/emos/api/shop/product/list", params), token);
}

export function getShopProductInfo(params: ShopProductInfoParams, token?: string) {
  return requestJson<ShopProductInfo>(buildApiPath("/api/emos/api/shop/product/info", params), token);
}

export function createShopOrder(data: ShopOrderCreatePayload, token?: string) {
  return requestJson<ShopOrderCreateResponse>(
    "/api/emos/api/shop/order/user/create",
    token,
    jsonRequestInit("POST", data)
  );
}

export function payShopOrder(data: ShopOrderNoPayload, token?: string) {
  return requestJson<ShopOrderPayResponse>(
    "/api/emos/api/shop/order/user/pay",
    token,
    jsonRequestInit("POST", data)
  );
}

export function getShopOrderList(params?: ShopOrderListParams, token?: string) {
  return requestJson<ShopOrderResponse>(buildApiPath("/api/emos/api/shop/order/user/list", params), token);
}

export function urgeShopOrder(data: ShopOrderNoPayload, token?: string) {
  return requestJson<ShopOrderUrgeResponse>(
    "/api/emos/api/shop/order/user/urge",
    token,
    jsonRequestInit("PUT", data)
  );
}

export function closeShopOrder(data: ShopOrderNoPayload, token?: string) {
  return requestJson<Record<string, never>>(
    "/api/emos/api/shop/order/user/close",
    token,
    jsonRequestInit("POST", data)
  );
}

export function deleteShopOrder(orderNo: string, token?: string) {
  return requestJson<ShopOrderDeleteResponse>(
    buildApiPath("/api/emos/api/shop/order/user/order", { order_no: orderNo }),
    token,
    { method: "DELETE" }
  );
}
