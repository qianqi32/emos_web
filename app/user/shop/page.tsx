"use client";

import { Loader2, Package, ReceiptText, RefreshCw, Search, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  closeShopOrder,
  createShopOrder,
  getShopCategoryList,
  getShopOrderList,
  getShopProductInfo,
  getShopProductList,
  getShopSellerBase,
  payShopOrder,
  urgeShopOrder,
} from "@/lib/api/client";
import type { ShopCategory, ShopOrderItem, ShopProductInfo, ShopProductItem, ShopSellerBase } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 24;

function formatCarrot(value: number | null | undefined) {
  return `${value ?? 0} 萝卜`;
}

function statusLabel(status: string) {
  if (status === "paid") return "已支付";
  if (status === "unpaid") return "待支付";
  if (status === "closed") return "已关闭";
  return status;
}

export default function ShopPage() {
  const { token, user } = useUserConsole();
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [sellerIdInput, setSellerIdInput] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [seller, setSeller] = useState<ShopSellerBase | null>(null);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [productName, setProductName] = useState("");
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [productTotal, setProductTotal] = useState(0);
  const [productNextPage, setProductNextPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(false);
  const [productLoadingMore, setProductLoadingMore] = useState(false);
  const [productStatus, setProductStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const productLoadMoreRef = useRef<HTMLDivElement | null>(null);

  const [orders, setOrders] = useState<ShopOrderItem[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [selectedProduct, setSelectedProduct] = useState<ShopProductInfo | null>(null);
  const [productDetailStatus, setProductDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [buyNumber, setBuyNumber] = useState("1");
  const [remark, setRemark] = useState("");
  const [action, setAction] = useState("idle");
  const [message, setMessage] = useState("");

  const loadSeller = useCallback(async () => {
    if (!sellerId) {
      return;
    }

    setMessage("");

    try {
      const [sellerResult, categoryResult] = await Promise.all([
        getShopSellerBase({ seller_id: sellerId }, token),
        getShopCategoryList({ seller_id: sellerId }, token),
      ]);
      setSeller(sellerResult);
      setCategories(categoryResult);
    } catch (error) {
      setSeller(null);
      setCategories([]);
      setMessage(error instanceof Error ? error.message : "店铺信息加载失败");
    }
  }, [sellerId, token]);

  const loadProducts = useCallback(async (mode: "reset" | "append" = "reset", pageToLoad = 1) => {
    setProductStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setProductLoadingMore(mode === "append");
    setMessage("");

    try {
      const result = await getShopProductList(
        {
          seller_id: sellerId || undefined,
          category_id: categoryId || undefined,
          name: productName.trim() || undefined,
          is_up: 1,
          page: pageToLoad,
          page_size: PAGE_SIZE,
          sort_by: "sort",
          sort_order: "asc",
        },
        token
      );
      setProducts((current) => (mode === "append" ? [...current, ...result.items] : result.items));
      setProductTotal(result.total);
      setProductNextPage(pageToLoad + 1);
      setProductHasMore(pageToLoad * result.page_size < result.total);
      setProductStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setProducts([]);
        setProductTotal(0);
        setProductHasMore(false);
        setProductStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "商品列表加载失败");
    } finally {
      setProductLoadingMore(false);
    }
  }, [categoryId, productName, sellerId, token]);

  const loadOrders = useCallback(async () => {
    setOrderStatus("loading");
    setMessage("");

    try {
      const result = await getShopOrderList(
        {
          seller_id: sellerId || undefined,
          order_title: orderSearch.trim() || undefined,
          order_no: orderSearch.trim() || undefined,
          page: 1,
          page_size: PAGE_SIZE,
        },
        token
      );
      setOrders(result.items);
      setOrderTotal(result.total);
      setOrderStatus("ready");
    } catch (error) {
      setOrders([]);
      setOrderTotal(0);
      setOrderStatus("error");
      setMessage(error instanceof Error ? error.message : "订单列表加载失败");
    }
  }, [orderSearch, sellerId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSeller();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSeller]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === "products") {
        void loadProducts();
      } else {
        void loadOrders();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, loadOrders, loadProducts]);

  useEffect(() => {
    const node = productLoadMoreRef.current;

    if (!node || activeTab !== "products" || !productHasMore || productStatus !== "ready" || productLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadProducts("append", productNextPage);
        }
      },
      { rootMargin: "420px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, loadProducts, productHasMore, productLoadingMore, productNextPage, productStatus]);

  function handleUseSeller() {
    const nextSellerId = sellerIdInput.trim();

    if (!nextSellerId) {
      setMessage("请输入店铺 ID");
      return;
    }

    setSellerId(nextSellerId);
    setCategoryId("");
    setProductName("");
    setNameInput("");
  }

  function handleClearSeller() {
    setSellerId("");
    setSellerIdInput("");
    setSeller(null);
    setCategories([]);
    setCategoryId("");
    setProductName("");
    setNameInput("");
  }

  async function handleOpenProduct(productId: number) {
    setSelectedProduct(null);
    setProductDetailStatus("loading");
    setBuyNumber("1");
    setRemark("");

    try {
      const result = await getShopProductInfo({ product_id: productId }, token);
      setSelectedProduct(result);
      setProductDetailStatus("ready");
    } catch (error) {
      setProductDetailStatus("error");
      setMessage(error instanceof Error ? error.message : "商品详情加载失败");
    }
  }

  async function handleCreateOrder() {
    if (!selectedProduct) {
      return;
    }

    const count = Number.parseInt(buyNumber, 10);

    if (!Number.isInteger(count) || count < 1 || count > 230) {
      setMessage("购买数量必须在 1-230 之间");
      return;
    }

    const totalPrice = (selectedProduct.price ?? selectedProduct.price_origin) * count;

    if (!window.confirm(`确认下单 ${selectedProduct.name} × ${count}，合计 ${totalPrice} 萝卜？`)) {
      return;
    }

    const confirmText = window.prompt("请输入 确认下单 继续");
    if (confirmText !== "确认下单") {
      setMessage("已取消下单");
      return;
    }

    setAction("create-order");

    try {
      const result = await createShopOrder(
        {
          product_id: selectedProduct.product_id,
          buy_number: count,
          remark: remark.trim() || null,
        },
        token
      );
      setMessage(`订单已创建：${result.no}，请在我的订单中支付`);
      setSelectedProduct(null);
      setActiveTab("orders");
      setOrderSearch(result.no);
      setOrderSearchInput(result.no);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "下单失败");
    } finally {
      setAction("idle");
    }
  }

  async function handlePayOrder(orderNo: string, price: number) {
    if (!window.confirm(`确认支付订单 ${orderNo}，扣除 ${price} 萝卜？`)) {
      return;
    }

    const confirmText = window.prompt("请输入 确认支付 继续");
    if (confirmText !== "确认支付") {
      setMessage("已取消支付");
      return;
    }

    setAction(orderNo);

    try {
      const result = await payShopOrder({ order_no: orderNo }, token);
      setMessage(result.message || "支付成功");
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "支付失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleCloseOrder(orderNo: string) {
    if (!window.confirm(`确认关闭订单 ${orderNo}？`)) {
      return;
    }

    setAction(orderNo);

    try {
      await closeShopOrder({ order_no: orderNo }, token);
      setMessage("订单已关闭");
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "关闭订单失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleUrgeOrder(orderNo: string) {
    setAction(orderNo);

    try {
      const result = await urgeShopOrder({ order_no: orderNo }, token);
      setMessage(`已催发货，累计 ${result.urge_number} 次`);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "催发货失败");
    } finally {
      setAction("idle");
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <ShoppingBag className="h-3.5 w-3.5" />
          Shop
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">商城</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              默认浏览全平台在售商品，也可输入店铺 ID 只看某个店铺。商品购买和订单支付属于权益变更操作，提交前会进行二次确认。
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
            当前萝卜 <span className="font-mono text-foreground">{user.carrot}</span>
          </div>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="px-4 py-3 text-sm text-muted-foreground">{message}</GlassPanel> : null}

      <GlassPanel className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <input
              value={sellerIdInput}
              onChange={(event) => setSellerIdInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleUseSeller()}
              placeholder="可选：输入店铺 ID 只看该店铺"
              className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <button
            type="button"
            onClick={handleUseSeller}
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            筛选店铺
          </button>
          <button
            type="button"
            onClick={handleClearSeller}
            disabled={!sellerId}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            全部店铺
          </button>
        </div>
        {seller ? (
          <div className="mt-4 rounded-2xl border border-border/50 bg-muted/10 p-4">
            <div className="text-sm font-semibold">{seller.name}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">{seller.description}</div>
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel className="p-2">
        <div className="flex gap-1">
          {[
            { key: "products", label: "商品" },
            { key: "orders", label: "我的订单" },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as "products" | "orders")}
                className={
                  isActive
                    ? "rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
                    : "rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      {activeTab === "products" ? (
        <div className="space-y-4">
          <GlassPanel className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto_auto]">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={!sellerId}
                className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:opacity-50"
              >
                <option value="">全部分类</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && setProductName(nameInput)}
                  placeholder="搜索商品名"
                  className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <button
                type="button"
                onClick={() => setProductName(nameInput)}
                disabled={productStatus === "loading"}
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                搜索
              </button>
              <button
                type="button"
                onClick={() => void loadProducts()}
                disabled={productStatus === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </GlassPanel>

          {productStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载商品中...</GlassPanel> : null}
          {productStatus === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
          {productStatus === "ready" && products.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无商品</GlassPanel> : null}

          {productStatus === "ready" && products.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground">
                共 <span className="font-mono text-foreground">{productTotal}</span> 件商品
              </div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <button
                    key={product.product_id}
                    type="button"
                    onClick={() => void handleOpenProduct(product.product_id)}
                    className="group overflow-hidden rounded-3xl border border-border/55 bg-background/45 text-left shadow-glass transition-transform duration-200 hover:-translate-y-1 hover:bg-background/60"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                      {product.cover_url ? (
                        <div
                          role="img"
                          aria-label={product.name}
                          className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${product.cover_url})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
                        库存 {product.stock}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="line-clamp-1 text-sm font-semibold">{product.name}</div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-base font-semibold text-amber-500">{formatCarrot(product.price ?? product.price_origin)}</div>
                        <div className="text-xs text-muted-foreground">销量 {product.sales}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div ref={productLoadMoreRef} className="h-8" />
              {productHasMore ? (
                <GlassPanel className="p-4 text-center text-sm text-muted-foreground">
                  {productLoadingMore ? "正在加载更多商品..." : `已加载 ${products.length} / ${productTotal}，继续下拉加载更多`}
                </GlassPanel>
              ) : (
                <GlassPanel className="p-4 text-center text-sm text-muted-foreground">已加载全部 {productTotal} 件商品</GlassPanel>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div className="space-y-4">
          <GlassPanel className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="relative block">
                <ReceiptText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={orderSearchInput}
                  onChange={(event) => setOrderSearchInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && setOrderSearch(orderSearchInput)}
                  placeholder="搜索订单号或商品标题"
                  className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                />
              </label>
              <button
                type="button"
                onClick={() => setOrderSearch(orderSearchInput)}
                disabled={orderStatus === "loading"}
                className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                搜索
              </button>
              <button
                type="button"
                onClick={() => void loadOrders()}
                disabled={orderStatus === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </button>
            </div>
          </GlassPanel>

          {orderStatus === "idle" || orderStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载订单中...</GlassPanel> : null}
          {orderStatus === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
          {orderStatus === "ready" && orders.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无订单</GlassPanel> : null}

          {orderStatus === "ready" && orders.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground">
                共 <span className="font-mono text-foreground">{orderTotal}</span> 个订单
              </div>
              <div className="space-y-3">
                {orders.map((order) => (
                  <GlassPanel key={order.order_no} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold">{order.order_title}</div>
                          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                            {statusLabel(order.status_pay)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">{order.order_no}</div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {order.seller.name} · 数量 {order.buy_number} · {formatCarrot(order.price_order)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status_pay === "unpaid" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handlePayOrder(order.order_no, order.price_order)}
                              disabled={action === order.order_no}
                              className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              支付
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleCloseOrder(order.order_no)}
                              disabled={action === order.order_no}
                              className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                            >
                              关闭
                            </button>
                          </>
                        ) : null}
                        {order.status_pay === "paid" && !order.time_delivery ? (
                          <button
                            type="button"
                            onClick={() => void handleUrgeOrder(order.order_no)}
                            disabled={action === order.order_no}
                            className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"
                          >
                            催发货
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {selectedProduct || productDetailStatus === "loading" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-background sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
              <div className="text-base font-semibold">商品详情</div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {productDetailStatus === "loading" ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载详情
                </div>
              ) : null}
              {selectedProduct ? (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                    {selectedProduct.cover_url ? (
                      <div
                        role="img"
                        aria-label={selectedProduct.name}
                        className="aspect-[16/9] bg-cover bg-center"
                        style={{ backgroundImage: `url(${selectedProduct.cover_url})` }}
                      />
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{selectedProduct.name}</div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">{selectedProduct.description}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                      <div className="text-xs text-muted-foreground">价格</div>
                      <div className="mt-1 text-base font-semibold text-amber-500">{formatCarrot(selectedProduct.price ?? selectedProduct.price_origin)}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                      <div className="text-xs text-muted-foreground">库存</div>
                      <div className="mt-1 text-base font-semibold">{selectedProduct.stock}</div>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                      <div className="text-xs text-muted-foreground">销量</div>
                      <div className="mt-1 text-base font-semibold">{selectedProduct.sales}</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
                    {selectedProduct.exchange_way}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <label>
                      <span className="mb-2 block text-xs text-muted-foreground">数量</span>
                      <input
                        type="number"
                        min="1"
                        max="230"
                        value={buyNumber}
                        onChange={(event) => setBuyNumber(event.target.value)}
                        className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label>
                      <span className="mb-2 block text-xs text-muted-foreground">备注</span>
                      <input
                        value={remark}
                        onChange={(event) => setRemark(event.target.value.slice(0, 100))}
                        placeholder="可选，100 字内"
                        className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateOrder()}
                    disabled={action === "create-order" || !selectedProduct.is_up}
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {action === "create-order" ? "提交中..." : "创建订单"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
