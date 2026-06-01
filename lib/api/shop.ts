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
  ShopSellerMutationResponse,
  ShopCategoryMutationResponse,
  ShopProductMutationResponse,
  ShopOrderDeliveryResponse,
  ShopOrderRemarkResponse,
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
  user_id?: number | string;
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

export interface ShopSellerPayload {
  name: string;
  description: string;
  cover?: string | null;
}

export interface ShopCategoryCreatePayload {
  name: string;
  sort: number;
}

export interface ShopCategorySortPayload {
  category_id: number;
  sort: number;
}

export interface ShopProductCreateOrUpdatePayload {
  product_id?: number | null;
  category_id: number;
  cover?: string | null;
  name: string;
  description: string;
  exchange_way: string;
  price: number;
  price_origin: number;
  stock: number;
  is_up: boolean;
  time_start?: string;
  time_end?: string;
  sort: number;
}

export interface ShopOrderRemarkPayload {
  order_no: string;
  remark: string;
}

export interface ShopOrderDeliveryPayload {
  order_no: string;
  is_delivery: boolean;
}

export interface ShopOrderNoPayload {
  order_no: string;
}

export function getShopSellerBase(params?: ShopSellerBaseParams, token?: string) {
  return requestJson<ShopSellerBase>(buildApiPath("/api/emos/api/shop/seller/base", params), token);
}

export function applyShopSeller(data: Omit<ShopSellerPayload, "cover">, token?: string) {
  return requestJson<ShopSellerMutationResponse>(
    "/api/emos/api/shop/seller/apply",
    token,
    jsonRequestInit("POST", data)
  );
}

export function updateShopSeller(data: ShopSellerPayload, token?: string) {
  return requestJson<ShopSellerMutationResponse>(
    "/api/emos/api/shop/seller/update",
    token,
    jsonRequestInit("POST", data)
  );
}

export function getShopCategoryList(params: ShopCategoryParams, token?: string) {
  return requestJson<ShopCategory[]>(buildApiPath("/api/emos/api/shop/category/list", params), token);
}

export function createShopCategory(data: ShopCategoryCreatePayload, token?: string) {
  return requestJson<ShopCategoryMutationResponse>(
    "/api/emos/api/shop/category/create",
    token,
    jsonRequestInit("POST", data)
  );
}

export function deleteShopCategory(categoryId: number | string, token?: string) {
  return requestJson<Record<string, never>>(
    buildApiPath("/api/emos/api/shop/category/delete", { category_id: categoryId }),
    token,
    { method: "DELETE" }
  );
}

export function sortShopCategory(data: ShopCategorySortPayload, token?: string) {
  return requestJson<ShopCategoryMutationResponse>(
    "/api/emos/api/shop/category/sort",
    token,
    jsonRequestInit("PUT", data)
  );
}

export function getShopProductList(params: ShopProductListParams, token?: string) {
  return requestJson<ShopProductResponse>(buildApiPath("/api/emos/api/shop/product/list", params), token);
}

export function getShopProductInfo(params: ShopProductInfoParams, token?: string) {
  return requestJson<ShopProductInfo>(buildApiPath("/api/emos/api/shop/product/info", params), token);
}

export function createOrUpdateShopProduct(data: ShopProductCreateOrUpdatePayload, token?: string) {
  return requestJson<ShopProductMutationResponse>(
    "/api/emos/api/shop/product/createOrUpdate",
    token,
    jsonRequestInit("POST", data)
  );
}

export function deleteShopProduct(productId: number | string, token?: string) {
  return requestJson<Record<string, never>>(
    buildApiPath("/api/emos/api/shop/product/delete", { product_id: productId }),
    token,
    { method: "DELETE" }
  );
}

export function updateShopProductSort(productId: number | string, sort: number, token?: string) {
  return requestJson<ShopProductMutationResponse>(
    buildApiPath("/api/emos/api/shop/product/sort", { product_id: productId, sort }),
    token,
    jsonRequestInit("PUT", {})
  );
}

export function updateShopProductCategory(productId: number | string, categoryId: number | string, token?: string) {
  return requestJson<ShopProductMutationResponse>(
    buildApiPath("/api/emos/api/shop/product/category", { product_id: productId, category_id: categoryId }),
    token,
    jsonRequestInit("PUT", {})
  );
}

export function toggleShopProductUp(productId: number | string, token?: string) {
  return requestJson<ShopProductMutationResponse>(
    buildApiPath("/api/emos/api/shop/product/up", { product_id: productId }),
    token,
    jsonRequestInit("PUT", {})
  );
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

export function getShopMerchantOrder(params?: ShopOrderListParams, token?: string) {
  return requestJson<ShopOrderResponse>(buildApiPath("/api/emos/api/shop/order/shop/order", params), token);
}

export function deleteShopMerchantOrder(orderNo: string, token?: string) {
  return requestJson<Record<string, never>>(
    buildApiPath("/api/emos/api/shop/order/shop/order", { order_no: orderNo }),
    token,
    { method: "DELETE" }
  );
}

export function deliverShopMerchantOrder(data: ShopOrderDeliveryPayload, token?: string) {
  return requestJson<ShopOrderDeliveryResponse>(
    "/api/emos/api/shop/order/shop/delivery",
    token,
    jsonRequestInit("PUT", data)
  );
}

export function remarkShopMerchantOrder(data: ShopOrderRemarkPayload, token?: string) {
  return requestJson<ShopOrderRemarkResponse>(
    "/api/emos/api/shop/order/shop/remark",
    token,
    jsonRequestInit("POST", data)
  );
}
