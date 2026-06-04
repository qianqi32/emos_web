"use client";

import { ArrowLeft, Copy, Loader2, Package, RefreshCw, Search, Store, X } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PageToast } from "@/components/ui/page-toast";
import { createShopOrder, getShopCategoryList, getShopProductInfo, getShopProductList, getShopSellerBase } from "@/lib/api/client";
import type { ShopCategory, ShopProductInfo, ShopProductItem, ShopSellerBase } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

const PAGE_SIZE = 24;

function formatCarrot(value: number | null | undefined) {
  return `${value ?? 0} 萝卜`;
}

function isSoldOut(product: Pick<ShopProductItem, "stock"> | Pick<ShopProductInfo, "stock">) {
  return product.stock <= 0;
}

function ProductCoverPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--muted))_0,hsl(var(--background))_55%,hsl(var(--muted))_100%)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background/70 shadow-sm backdrop-blur">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
    </div>
  );
}

export default function ShopSellerPage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = use(params);
  const { token } = useUserConsole();
  const [seller, setSeller] = useState<ShopSellerBase | null>(null);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProductItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [categoryId, setCategoryId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopProductInfo | null>(null);
  const [productDetailStatus, setProductDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [productDetailError, setProductDetailError] = useState("");
  const [buyNumber, setBuyNumber] = useState("1");
  const [remark, setRemark] = useState("");
  const [pendingOrder, setPendingOrder] = useState<{ product: ShopProductInfo; count: number; totalPrice: number } | null>(null);
  const [orderAction, setOrderAction] = useState("idle");
  const [dialogError, setDialogError] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const totalSales = useMemo(() => products.reduce((sum, item) => sum + (item.sales || 0), 0), [products]);

  const loadSeller = useCallback(async () => {
    setMessage("");

    try {
      const [sellerResult, categoryResult] = await Promise.all([
        getShopSellerBase({ seller_id: sellerId }, token),
        getShopCategoryList({ seller_id: sellerId }, token)
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
    setStatus((current) => (mode === "append" && current === "ready" ? current : "loading"));
    setLoadingMore(mode === "append");
    setMessage("");

    try {
      const result = await getShopProductList(
        {
          seller_id: sellerId,
          category_id: categoryId || undefined,
          name: search.trim() || undefined,
          is_up: 1,
          page: pageToLoad,
          page_size: PAGE_SIZE,
          sort_by: "sort",
          sort_order: "asc"
        },
        token
      );
      setProducts((current) => (mode === "append" ? [...current, ...result.items] : result.items));
      setTotal(result.total);
      setNextPage(pageToLoad + 1);
      setHasMore(pageToLoad * result.page_size < result.total);
      setStatus("ready");
    } catch (error) {
      if (mode === "reset") {
        setProducts([]);
        setTotal(0);
        setHasMore(false);
        setStatus("error");
      }
      setMessage(error instanceof Error ? error.message : "商品列表加载失败");
    } finally {
      setLoadingMore(false);
    }
  }, [categoryId, search, sellerId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSeller();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSeller]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts("reset", 1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || !hasMore || status !== "ready" || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadProducts("append", nextPage);
        }
      },
      { rootMargin: "420px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadProducts, loadingMore, nextPage, status]);

  function handleSearch() {
    setSearch(searchInput);
  }

  function handleCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("店铺链接已复制");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "复制失败");
    }
  }

  async function handleOpenProduct(productId: number) {
    setSelectedProduct(null);
    setProductDetailError("");
    setProductDetailStatus("loading");
    setBuyNumber("1");
    setRemark("");

    try {
      const result = await getShopProductInfo({ product_id: productId }, token);
      setSelectedProduct(result);
      setProductDetailStatus("ready");
    } catch (error) {
      setProductDetailStatus("error");
      setProductDetailError(error instanceof Error ? error.message : "商品详情加载失败");
    }
  }

  function closeProductDetail() {
    setSelectedProduct(null);
    setProductDetailStatus("idle");
    setProductDetailError("");
  }

  function handleCreateOrder() {
    if (!selectedProduct) {
      return;
    }

    if (isSoldOut(selectedProduct)) {
      setMessage("该商品已售罄，暂时无法购买");
      return;
    }

    const count = Number.parseInt(buyNumber, 10);
    const orderRemark = remark.trim();

    if (!Number.isInteger(count) || count < 1 || count > 230) {
      setMessage("购买数量必须在 1-230 之间");
      return;
    }

    if (orderRemark.length > 100) {
      setMessage("订单备注不能超过 100 字");
      return;
    }

    setDialogError("");
    setPendingOrder({ product: selectedProduct, count, totalPrice: (selectedProduct.price ?? selectedProduct.price_origin) * count });
  }

  async function submitCreateOrder() {
    if (!pendingOrder) {
      return;
    }

    setOrderAction("create-order");
    setDialogError("");

    try {
      const result = await createShopOrder(
        { product_id: pendingOrder.product.product_id, buy_number: pendingOrder.count, remark: remark.trim() || null },
        token
      );
      setPendingOrder(null);
      closeProductDetail();
      setMessage(`订单已创建：${result.no}，请在我的订单中支付`);
      await loadProducts("reset", 1);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "下单失败");
    } finally {
      setOrderAction("idle");
    }
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <PageToast message={status === "error" ? "" : message} onClose={() => setMessage("")} />
      <GlassPanel className="p-5 sm:p-6 lg:p-8">
        <Link href="/user/shop" className="inline-flex h-9 items-center gap-2 rounded-full border border-border/70 px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          返回商城
        </Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-muted/20">
              {seller?.cover_url ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${seller.cover_url})` }} /> : <Store className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                Seller #{sellerId}
              </div>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{seller?.name || "店铺详情"}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{seller?.description || "正在加载店铺简介..."}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">商品 <span className="font-mono text-foreground">{total}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">销量 <span className="font-mono text-foreground">{totalSales}</span></div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-muted-foreground">分类 <span className="font-mono text-foreground">{categories.length}</span></div>
            <button type="button" onClick={() => void handleShare()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/35 hover:text-foreground">
              <Copy className="h-4 w-4" />
              分享
            </button>
          </div>
        </div>
      </GlassPanel>


      <GlassPanel className="p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto_auto]">
          <select value={categoryId} onChange={(event) => handleCategoryChange(event.target.value)} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
            <option value="">全部分类</option>
            {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}
          </select>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleSearch()} placeholder="搜索店铺内商品" className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
          </label>
          <button type="button" onClick={handleSearch} disabled={status === "loading"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">查询</button>
          <button type="button" onClick={() => void loadProducts()} disabled={status === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <button key={category.category_id} type="button" onClick={() => handleCategoryChange(String(category.category_id))} className={categoryId === String(category.category_id) ? "rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background" : "rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"}>
              {category.name}
            </button>
          ))}
        </div>
      </GlassPanel>

      {status === "loading" && products.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />正在加载商品...</GlassPanel> : null}
      {status === "error" ? <GlassPanel className="p-8 text-sm text-danger">{message || "商品列表加载失败"}</GlassPanel> : null}
      {status === "ready" && products.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">当前筛选下暂无商品。</GlassPanel> : null}

      {status === "ready" && products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => {
              const soldOut = isSoldOut(product);

              return (
                <button key={product.product_id} type="button" onClick={() => void handleOpenProduct(product.product_id)} className="group overflow-hidden rounded-3xl border border-border/60 bg-card text-left shadow-glass transition-transform duration-200 hover:-translate-y-1 hover:bg-card/95">
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted/20">
                    {product.cover_url ? <div role="img" aria-label={product.name} className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${product.cover_url})` }} /> : <ProductCoverPlaceholder />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className={soldOut ? "absolute left-3 top-3 rounded-full border border-warning/30 bg-background/90 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm" : "absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md"}>{soldOut ? "已售罄" : `库存 ${product.stock}`}</div>
                  </div>
                  <div className="p-4">
                    <div className="line-clamp-1 text-sm font-semibold">{product.name}</div>
                    <div className="mt-2 text-xs text-muted-foreground">销量 {product.sales}</div>
                    <div className="mt-3 text-base font-semibold text-amber-500">{formatCarrot(product.price ?? product.price_origin)}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div ref={loadMoreRef} className="h-8" />
          <GlassPanel className="p-4 text-center text-sm text-muted-foreground">
            {hasMore ? (loadingMore ? "正在加载更多商品..." : `已加载 ${products.length} / ${total}，继续下拉加载更多`) : `已加载全部 ${total} 件商品`}
          </GlassPanel>
        </>
      ) : null}

      {selectedProduct || productDetailStatus === "loading" || productDetailStatus === "error" ? <ProductDetailModal selectedProduct={selectedProduct} productDetailStatus={productDetailStatus} error={productDetailError} buyNumber={buyNumber} remark={remark} action={orderAction} onClose={closeProductDetail} onBuyNumberChange={setBuyNumber} onRemarkChange={setRemark} onCreateOrder={handleCreateOrder} /> : null}

      <ConfirmDialog
        open={pendingOrder !== null}
        title="确认创建订单"
        description={pendingOrder ? `将创建「${pendingOrder.product.name}」× ${pendingOrder.count} 的订单，合计 ${pendingOrder.totalPrice} 萝卜。` : undefined}
        confirmLabel="确认提交"
        confirmText="确认下单"
        error={dialogError}
        loading={orderAction !== "idle"}
        onCancel={() => { setPendingOrder(null); setDialogError(""); }}
        onConfirm={() => void submitCreateOrder()}
      />
    </div>
  );
}

function ProductDetailModal({ selectedProduct, productDetailStatus, error, buyNumber, remark, action, onClose, onBuyNumberChange, onRemarkChange, onCreateOrder }: { selectedProduct: ShopProductInfo | null; productDetailStatus: "idle" | "loading" | "ready" | "error"; error: string; buyNumber: string; remark: string; action: string; onClose: () => void; onBuyNumberChange: (value: string) => void; onRemarkChange: (value: string) => void; onCreateOrder: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-background sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">商品详情</div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40" aria-label="关闭商品详情">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {productDetailStatus === "loading" ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在加载详情</div> : null}
          {productDetailStatus === "error" ? <div className="py-8 text-sm text-danger">{error || "商品详情加载失败"}</div> : null}
          {selectedProduct ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                {selectedProduct.cover_url ? <div role="img" aria-label={selectedProduct.name} className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.cover_url})` }} /> : <div className="aspect-[16/9]"><ProductCoverPlaceholder /></div>}
              </div>
              <div>
                <div className="text-lg font-semibold">{selectedProduct.name}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{selectedProduct.description || "暂无商品简介"}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">价格</div><div className="mt-1 text-base font-semibold text-amber-500">{formatCarrot(selectedProduct.price ?? selectedProduct.price_origin)}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">库存</div><div className={isSoldOut(selectedProduct) ? "mt-1 text-base font-semibold text-danger" : "mt-1 text-base font-semibold"}>{isSoldOut(selectedProduct) ? "已售罄" : selectedProduct.stock}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">销量</div><div className="mt-1 text-base font-semibold">{selectedProduct.sales}</div></div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">
                <div className="mb-2 text-xs font-semibold text-foreground">兑换方式</div>
                {selectedProduct.exchange_way || "暂无兑换方式说明"}
              </div>
              {isSoldOut(selectedProduct) ? <div className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm leading-6 text-danger">该商品已售罄，仅展示商品信息，暂时无法创建订单。</div> : null}
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label><span className="mb-2 block text-xs text-muted-foreground">数量</span><input type="number" min="1" max="230" value={buyNumber} onChange={(event) => onBuyNumberChange(event.target.value)} className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></label>
                <label><span className="mb-2 block text-xs text-muted-foreground">备注</span><input value={remark} onChange={(event) => onRemarkChange(event.target.value.slice(0, 100))} placeholder="可选，100 字内" className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></label>
              </div>
              <button type="button" onClick={onCreateOrder} disabled={action === "create-order" || !selectedProduct.is_up || isSoldOut(selectedProduct)} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">{action === "create-order" ? "提交中..." : isSoldOut(selectedProduct) ? "已售罄" : "创建订单"}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
