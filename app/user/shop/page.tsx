"use client";

import Link from "next/link";
import { Loader2, Package, ReceiptText, RefreshCw, Search, ShoppingBag, Store, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TemporaryFileInput } from "@/components/ui/temporary-file-input";
import {
  applyShopSeller,
  closeShopOrder,
  createOrUpdateShopProduct,
  createShopCategory,
  createShopOrder,
  deleteShopCategory,
  deleteShopMerchantOrder,
  deleteShopOrder,
  deleteShopProduct,
  deliverShopMerchantOrder,
  getShopCategoryList,
  getShopMerchantOrder,
  getShopOrderList,
  getShopProductInfo,
  getShopProductList,
  getShopSellerBase,
  payShopOrder,
  remarkShopMerchantOrder,
  sortShopCategory,
  toggleShopProductUp,
  updateShopProductSort,
  updateShopSeller,
  urgeShopOrder,
} from "@/lib/api/client";
import type { ShopCategory, ShopOrderItem, ShopProductInfo, ShopProductItem, ShopSellerBase } from "@/lib/api/types";
import { useUserConsole } from "@/components/dashboard/user-console-context";

type ActiveTab = "products" | "orders" | "seller" | "categories" | "manage-products" | "merchant-orders";

type PendingShopAction =
  | { type: "create-order"; count: number; totalPrice: number; product: ShopProductInfo }
  | { type: "pay-order"; orderNo: string; price: number }
  | { type: "close-order"; orderNo: string }
  | { type: "delete-user-order"; orderNo: string }
  | { type: "delete-category"; category: ShopCategory }
  | { type: "sort-category"; category: ShopCategory }
  | { type: "delete-product"; product: ShopProductItem }
  | { type: "toggle-product"; product: ShopProductItem }
  | { type: "sort-product"; product: ShopProductItem }
  | { type: "deliver-order"; orderNo: string }
  | { type: "remark-order"; orderNo: string }
  | { type: "delete-merchant-order"; orderNo: string }
  | null;

interface SellerFormState {
  name: string;
  description: string;
  cover: string;
}

interface CategoryFormState {
  name: string;
  sort: string;
}

interface ProductFormState {
  productId: number | null;
  categoryId: string;
  cover: string;
  name: string;
  description: string;
  exchangeWay: string;
  price: string;
  priceOrigin: string;
  stock: string;
  isUp: boolean;
  timeStart: string;
  timeEnd: string;
  sort: string;
}

const PAGE_SIZE = 24;
const emptySellerForm: SellerFormState = { name: "", description: "", cover: "" };
const emptyCategoryForm: CategoryFormState = { name: "", sort: "1" };
const emptyProductForm: ProductFormState = {
  productId: null,
  categoryId: "",
  cover: "",
  name: "",
  description: "",
  exchangeWay: "",
  price: "",
  priceOrigin: "",
  stock: "",
  isUp: true,
  timeStart: "",
  timeEnd: "",
  sort: "1",
};

function formatCarrot(value: number | null | undefined) {
  return `${value ?? 0} 萝卜`;
}

function statusLabel(status: string) {
  if (status === "paid") return "已支付";
  if (status === "unpaid") return "待支付";
  if (status === "closed") return "已关闭";
  return status;
}

function sellerStatusLabel(status: string | undefined) {
  if (status === "default") return "默认";
  if (status === "examine") return "审核中";
  if (status === "pass") return "已通过";
  if (status === "disable") return "已禁用";
  return status || "未申请";
}

function toApiDateTime(value: string) {
  return value ? value.replace("T", " ") + (value.length === 16 ? ":00" : "") : undefined;
}

function toLocalDateTime(value: string | null | undefined) {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

function parseInteger(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export default function ShopPage() {
  const { token, user } = useUserConsole();
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");
  const [sellerIdInput, setSellerIdInput] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [seller, setSeller] = useState<ShopSellerBase | null>(null);
  const [sellerSelf, setSellerSelf] = useState<ShopSellerBase | null>(null);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<ShopCategory[]>([]);
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
  const [orderPage, setOrderPage] = useState(1);
  const [orderSearchInput, setOrderSearchInput] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPay, setOrderPay] = useState("");
  const [orderDelivery, setOrderDelivery] = useState("");
  const [orderStatus, setOrderStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const [merchantProducts, setMerchantProducts] = useState<ShopProductItem[]>([]);
  const [merchantProductStatus, setMerchantProductStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [merchantProductTotal, setMerchantProductTotal] = useState(0);
  const [merchantProductPage, setMerchantProductPage] = useState(1);
  const [merchantProductCategoryId, setMerchantProductCategoryId] = useState("");
  const [merchantProductNameInput, setMerchantProductNameInput] = useState("");
  const [merchantProductName, setMerchantProductName] = useState("");
  const [merchantProductUp, setMerchantProductUp] = useState("");
  const [merchantOrders, setMerchantOrders] = useState<ShopOrderItem[]>([]);
  const [merchantOrderStatus, setMerchantOrderStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [merchantOrderTotal, setMerchantOrderTotal] = useState(0);
  const [merchantOrderPage, setMerchantOrderPage] = useState(1);
  const [merchantOrderSearchInput, setMerchantOrderSearchInput] = useState("");
  const [merchantOrderSearch, setMerchantOrderSearch] = useState("");
  const [merchantOrderPay, setMerchantOrderPay] = useState("");
  const [merchantOrderDelivery, setMerchantOrderDelivery] = useState("");
  const [sellerForm, setSellerForm] = useState<SellerFormState>(emptySellerForm);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const productFormRef = useRef<HTMLElement | null>(null);
  const [dialogInput, setDialogInput] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<ShopProductInfo | null>(null);
  const [productDetailStatus, setProductDetailStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [buyNumber, setBuyNumber] = useState("1");
  const [remark, setRemark] = useState("");
  const [action, setAction] = useState("idle");
  const [pendingAction, setPendingAction] = useState<PendingShopAction>(null);
  const [message, setMessage] = useState("");
  const [dialogError, setDialogError] = useState("");
  const sellerSelfId = sellerSelf?.seller_id;

  const loadSellerSelf = useCallback(async () => {
    try {
      const result = await getShopSellerBase({}, token);
      setSellerSelf(result);
      setSellerForm({ name: result.name || "", description: result.description || "", cover: result.cover || "" });
    } catch {
      setSellerSelf(null);
      setSellerForm(emptySellerForm);
    }
  }, [token]);

  const loadMerchantCategories = useCallback(async () => {
    if (!sellerSelfId) {
      setMerchantCategories([]);
      return;
    }

    try {
      const result = await getShopCategoryList({ seller_id: sellerSelfId }, token);
      setMerchantCategories(result);
    } catch (error) {
      setMerchantCategories([]);
      setMessage(error instanceof Error ? error.message : "分类加载失败");
    }
  }, [sellerSelfId, token]);

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
          is_pay: orderPay || undefined,
          is_delivery: orderDelivery || undefined,
          page: orderPage,
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
  }, [orderDelivery, orderPage, orderPay, orderSearch, sellerId, token]);

  const loadMerchantProducts = useCallback(async () => {
    if (!sellerSelfId) {
      setMerchantProducts([]);
      setMerchantProductTotal(0);
      setMerchantProductStatus("ready");
      return;
    }

    setMerchantProductStatus("loading");
    setMessage("");

    try {
      const result = await getShopProductList(
        {
          seller_id: sellerSelfId,
          category_id: merchantProductCategoryId || undefined,
          name: merchantProductName.trim() || undefined,
          is_up: merchantProductUp || undefined,
          page: merchantProductPage,
          page_size: PAGE_SIZE,
          sort_by: "sort",
          sort_order: "asc",
        },
        token
      );
      setMerchantProducts(result.items);
      setMerchantProductTotal(result.total);
      setMerchantProductStatus("ready");
    } catch (error) {
      setMerchantProducts([]);
      setMerchantProductTotal(0);
      setMerchantProductStatus("error");
      setMessage(error instanceof Error ? error.message : "商户商品加载失败");
    }
  }, [merchantProductCategoryId, merchantProductName, merchantProductPage, merchantProductUp, sellerSelfId, token]);

  const loadMerchantOrders = useCallback(async () => {
    if (!sellerSelfId) {
      setMerchantOrders([]);
      setMerchantOrderTotal(0);
      setMerchantOrderStatus("ready");
      return;
    }

    setMerchantOrderStatus("loading");
    setMessage("");

    try {
      const search = merchantOrderSearch.trim();
      const result = await getShopMerchantOrder(
        {
          order_title: search || undefined,
          order_no: search || undefined,
          is_pay: merchantOrderPay || undefined,
          is_delivery: merchantOrderDelivery || undefined,
          page: merchantOrderPage,
          page_size: PAGE_SIZE,
        },
        token
      );
      setMerchantOrders(result.items);
      setMerchantOrderTotal(result.total);
      setMerchantOrderStatus("ready");
    } catch (error) {
      setMerchantOrders([]);
      setMerchantOrderTotal(0);
      setMerchantOrderStatus("error");
      setMessage(error instanceof Error ? error.message : "商户订单加载失败");
    }
  }, [merchantOrderDelivery, merchantOrderPage, merchantOrderPay, merchantOrderSearch, sellerSelfId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSellerSelf();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadSellerSelf]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMerchantCategories();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMerchantCategories]);

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
      } else if (activeTab === "orders") {
        void loadOrders();
      } else if (activeTab === "manage-products") {
        void loadMerchantProducts();
      } else if (activeTab === "merchant-orders") {
        void loadMerchantOrders();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, loadMerchantOrders, loadMerchantProducts, loadOrders, loadProducts]);

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
    openDialog({ type: "create-order", count, totalPrice, product: selectedProduct });
  }

  async function submitCreateOrder(product: ShopProductInfo, count: number) {
    setAction("create-order");

    try {
      const result = await createShopOrder(
        { product_id: product.product_id, buy_number: count, remark: remark.trim() || null },
        token
      );
      setMessage(`订单已创建：${result.no}，请在我的订单中支付`);
      setSelectedProduct(null);
      setPendingAction(null);
      setActiveTab("orders");
      setOrderSearch(result.no);
      setOrderSearchInput(result.no);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "下单失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitPayOrder(orderNo: string) {
    setAction(orderNo);

    try {
      const result = await payShopOrder({ order_no: orderNo }, token);
      setMessage(result.message || "支付成功");
      setPendingAction(null);
      await loadOrders();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "支付失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitCloseOrder(orderNo: string) {
    setAction(orderNo);

    try {
      await closeShopOrder({ order_no: orderNo }, token);
      setMessage("订单已关闭");
      setPendingAction(null);
      await loadOrders();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "关闭订单失败");
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

  async function submitDeleteUserOrder(orderNo: string) {
    setAction(orderNo);

    try {
      await deleteShopOrder(orderNo, token);
      setMessage("订单已删除");
      setPendingAction(null);
      if (orders.length === 1 && orderPage > 1) {
        setOrderPage((current) => Math.max(1, current - 1));
      } else {
        await loadOrders();
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "删除订单失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleSubmitSeller() {
    const name = sellerForm.name.trim();
    const description = sellerForm.description.trim();

    if (!name || name.length > 30) {
      setMessage("店铺名称需为 1-30 字");
      return;
    }

    if (!description || description.length > 200) {
      setMessage("店铺简介需为 1-200 字");
      return;
    }

    setAction("seller");
    setMessage("");

    try {
      if (sellerSelf?.seller_id) {
        await updateShopSeller({ name, description, cover: sellerForm.cover.trim() || null }, token);
        setMessage("店铺信息已更新");
      } else {
        await applyShopSeller({ name, description }, token);
        setMessage("申请已提交，请等待审核");
      }
      await loadSellerSelf();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店铺提交失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleCreateCategory() {
    const name = categoryForm.name.trim();
    const sort = parseInteger(categoryForm.sort, 1, 100);

    if (!name || name.length > 20) {
      setMessage("分类名称需为 1-20 字");
      return;
    }

    if (sort === null) {
      setDialogError("分类排序需为 1-100 的整数");
      return;
    }

    setAction("category");
    setMessage("");

    try {
      await createShopCategory({ name, sort }, token);
      setCategoryForm(emptyCategoryForm);
      setMessage("分类已创建");
      await loadMerchantCategories();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建分类失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitSortCategory(categoryIdValue: number) {
    const sort = parseInteger(dialogInput, 1, 100);

    if (sort === null) {
      setMessage("分类排序需为 1-100 的整数");
      return;
    }

    setAction("category-sort");

    try {
      await sortShopCategory({ category_id: categoryIdValue, sort }, token);
      setMessage("分类排序已更新");
      setPendingAction(null);
      setDialogInput("");
      await loadMerchantCategories();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "分类排序失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitDeleteCategory(categoryIdValue: number) {
    setAction("category-delete");

    try {
      await deleteShopCategory(categoryIdValue, token);
      setMessage("分类已删除");
      setPendingAction(null);
      await loadMerchantCategories();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "删除分类失败");
    } finally {
      setAction("idle");
    }
  }

  function resetProductForm() {
    setProductForm(emptyProductForm);
  }

  async function handleEditProduct(productId: number) {
    setAction(`edit-${productId}`);

    try {
      const product = await getShopProductInfo({ product_id: productId }, token);
      setProductForm({
        productId: product.product_id,
        categoryId: String(product.category_id),
        cover: product.cover || "",
        name: product.name || "",
        description: product.description || "",
        exchangeWay: product.exchange_way || "",
        price: String(product.price ?? product.price_origin ?? ""),
        priceOrigin: String(product.price_origin ?? product.price ?? ""),
        stock: String(product.stock ?? ""),
        isUp: product.is_up,
        timeStart: toLocalDateTime(product.time_start),
        timeEnd: toLocalDateTime(product.time_end),
        sort: String(product.sort || 1),
      });
      setActiveTab("manage-products");
      window.setTimeout(() => {
        productFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "商品详情加载失败");
    } finally {
      setAction("idle");
    }
  }

  async function handleSubmitProduct() {
    const category = parseInteger(productForm.categoryId, 1, Number.MAX_SAFE_INTEGER);
    const price = parseInteger(productForm.price, 1, 50000);
    const priceOrigin = parseInteger(productForm.priceOrigin || productForm.price, 1, 50000);
    const stock = parseInteger(productForm.stock, 1, 5000);
    const sort = parseInteger(productForm.sort, 1, 5000);
    const name = productForm.name.trim();
    const description = productForm.description.trim();
    const exchangeWay = productForm.exchangeWay.trim();

    if (merchantCategories.length === 0) {
      setMessage("请先创建商品分类，再创建商品");
      return;
    }

    if (!category) {
      setMessage("请选择商品分类");
      return;
    }

    if (!name || name.length > 50) {
      setMessage("商品名称需为 1-50 字");
      return;
    }

    if (description.length > 200) {
      setMessage("商品简介不能超过 200 字");
      return;
    }

    if (!exchangeWay || exchangeWay.length > 1000) {
      setMessage("兑换方式需为 1-1000 字");
      return;
    }

    if (price === null || priceOrigin === null || stock === null || sort === null) {
      setMessage("价格、原价、库存、排序需填写有效整数");
      return;
    }

    setAction("product-submit");
    setMessage("");

    try {
      await createOrUpdateShopProduct(
        {
          product_id: productForm.productId,
          category_id: category,
          cover: productForm.cover.trim() || null,
          name,
          description,
          exchange_way: exchangeWay,
          price,
          price_origin: priceOrigin,
          stock,
          is_up: productForm.isUp,
          time_start: toApiDateTime(productForm.timeStart),
          time_end: toApiDateTime(productForm.timeEnd),
          sort,
        },
        token
      );
      setMessage(productForm.productId ? "商品已更新" : "商品已创建");
      resetProductForm();
      await loadMerchantProducts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "商品提交失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitToggleProduct(productId: number) {
    setAction(`toggle-${productId}`);

    try {
      await toggleShopProductUp(productId, token);
      setMessage("商品上下架状态已更新");
      setPendingAction(null);
      await loadMerchantProducts();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "上下架失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitDeleteProduct(productId: number) {
    setAction(`delete-${productId}`);

    try {
      await deleteShopProduct(productId, token);
      setMessage("商品已删除");
      setPendingAction(null);
      if (merchantProducts.length === 1 && merchantProductPage > 1) {
        setMerchantProductPage((current) => Math.max(1, current - 1));
      } else {
        await loadMerchantProducts();
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "删除商品失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitSortProduct(productId: number) {
    const sort = parseInteger(dialogInput, 1, 5000);

    if (sort === null) {
      setDialogError("商品排序需为 1-5000 的整数");
      return;
    }

    setAction(`sort-${productId}`);

    try {
      await updateShopProductSort(productId, sort, token);
      setMessage("商品排序已更新");
      setPendingAction(null);
      setDialogInput("");
      await loadMerchantProducts();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "商品排序失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitDeliverOrder(orderNo: string) {
    setAction(orderNo);

    try {
      await deliverShopMerchantOrder({ order_no: orderNo, is_delivery: true }, token);
      setMessage("订单已标记发货");
      setPendingAction(null);
      await loadMerchantOrders();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "发货失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitRemarkOrder(orderNo: string) {
    const nextRemark = dialogInput.trim();

    if (!nextRemark || nextRemark.length > 200) {
      setDialogError("商户备注需为 1-200 字");
      return;
    }

    setAction(orderNo);

    try {
      await remarkShopMerchantOrder({ order_no: orderNo, remark: nextRemark }, token);
      setMessage("商户备注已保存");
      setPendingAction(null);
      setDialogInput("");
      await loadMerchantOrders();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "备注保存失败");
    } finally {
      setAction("idle");
    }
  }

  async function submitDeleteMerchantOrder(orderNo: string) {
    setAction(orderNo);

    try {
      await deleteShopMerchantOrder(orderNo, token);
      setMessage("商户订单已删除");
      setPendingAction(null);
      if (merchantOrders.length === 1 && merchantOrderPage > 1) {
        setMerchantOrderPage((current) => Math.max(1, current - 1));
      } else {
        await loadMerchantOrders();
      }
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "删除商户订单失败");
    } finally {
      setAction("idle");
    }
  }

  const tabs: Array<{ key: ActiveTab; label: string; sellerOnly?: boolean }> = [
    { key: "products", label: "商品浏览" },
    { key: "orders", label: "我的订单" },
    { key: "seller", label: sellerSelf?.seller_id ? "我的店铺" : "申请开店" },
    { key: "categories", label: "分类管理", sellerOnly: true },
    { key: "manage-products", label: "商品管理", sellerOnly: true },
    { key: "merchant-orders", label: "商户订单", sellerOnly: true },
  ];

  const isSeller = Boolean(sellerSelf?.seller_id);

  function openDialog(action: PendingShopAction, input = "") {
    setDialogInput(input);
    setDialogError("");
    setPendingAction(action);
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
              商品购买、订单支付与商户经营统一在商城中心处理。商户功能会根据当前账号店铺状态展示，无权限时提供申请入口。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              当前萝卜 <span className="font-mono text-foreground">{user.carrot}</span>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              店铺状态 <span className="font-medium text-foreground">{sellerStatusLabel(sellerSelf?.status)}</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {message ? <GlassPanel className="px-4 py-3 text-sm text-muted-foreground">{message}</GlassPanel> : null}

      <GlassPanel className="p-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            if (tab.sellerOnly && !isSeller) {
              return null;
            }

            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
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
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <input value={sellerIdInput} onChange={(event) => setSellerIdInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleUseSeller()} placeholder="可选：输入店铺 ID 只看该店铺" className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <button type="button" onClick={handleUseSeller} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90">筛选店铺</button>
              <button type="button" onClick={handleClearSeller} disabled={!sellerId} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"><X className="h-4 w-4" />全部店铺</button>
            </div>
            {seller ? <div className="mt-4 rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-sm font-semibold">{seller.name}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{seller.description}</div></div> : null}
          </GlassPanel>

          <GlassPanel className="p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto_auto]">
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={!sellerId} className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15 disabled:opacity-50">
                <option value="">全部分类</option>
                {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}
              </select>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setProductName(nameInput)} placeholder="搜索商品名" className="h-11 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              </label>
              <button type="button" onClick={() => setProductName(nameInput)} disabled={productStatus === "loading"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">搜索</button>
              <button type="button" onClick={() => void loadProducts()} disabled={productStatus === "loading"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 px-5 text-sm font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50"><RefreshCw className="h-4 w-4" />刷新</button>
            </div>
          </GlassPanel>

          {productStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载商品中...</GlassPanel> : null}
          {productStatus === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
          {productStatus === "ready" && products.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无商品</GlassPanel> : null}

          {productStatus === "ready" && products.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground">共 <span className="font-mono text-foreground">{productTotal}</span> 件商品</div>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <button key={product.product_id} type="button" onClick={() => void handleOpenProduct(product.product_id)} className="group overflow-hidden rounded-3xl border border-border/55 bg-background/45 text-left shadow-glass transition-transform duration-200 hover:-translate-y-1 hover:bg-background/60">
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted/30">
                      {product.cover_url ? <div role="img" aria-label={product.name} className="h-full w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${product.cover_url})` }} /> : <div className="flex h-full w-full items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>}
                      <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-md">库存 {product.stock}</div>
                    </div>
                    <div className="p-4"><div className="line-clamp-1 text-sm font-semibold">{product.name}</div><div className="mt-3 flex items-center justify-between gap-3"><div className="text-base font-semibold text-amber-500">{formatCarrot(product.price ?? product.price_origin)}</div><div className="text-xs text-muted-foreground">销量 {product.sales}</div></div></div>
                  </button>
                ))}
              </div>
              <div ref={productLoadMoreRef} className="h-8" />
              <GlassPanel className="p-4 text-center text-sm text-muted-foreground">{productHasMore ? (productLoadingMore ? "正在加载更多商品..." : `已加载 ${products.length} / ${productTotal}，继续下拉加载更多`) : `已加载全部 ${productTotal} 件商品`}</GlassPanel>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "orders" ? (
        <div className="space-y-4">
          <UserOrderFilters
            searchInput={orderSearchInput}
            payStatus={orderPay}
            deliveryStatus={orderDelivery}
            loading={orderStatus === "loading"}
            onSearchInputChange={setOrderSearchInput}
            onPayStatusChange={setOrderPay}
            onDeliveryStatusChange={setOrderDelivery}
            onSearch={() => {
              setOrderPage(1);
              setOrderSearch(orderSearchInput);
            }}
            onReset={() => {
              setOrderPage(1);
              setOrderSearchInput("");
              setOrderSearch("");
              setOrderPay("");
              setOrderDelivery("");
            }}
          />
          <PaginationControls
            page={orderPage}
            total={orderTotal}
            pageSize={PAGE_SIZE}
            loading={orderStatus === "loading"}
            onPageChange={setOrderPage}
          />
          {orderStatus === "idle" || orderStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载订单中...</GlassPanel> : null}
          {orderStatus === "error" ? <GlassPanel className="p-6 text-sm text-danger">{message}</GlassPanel> : null}
          {orderStatus === "ready" && orders.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无订单</GlassPanel> : null}
          {orderStatus === "ready" && orders.length > 0 ? <OrderList orders={orders} total={orderTotal} action={action} onPay={(order) => openDialog({ type: "pay-order", orderNo: order.order_no, price: order.price_order })} onClose={(order) => openDialog({ type: "close-order", orderNo: order.order_no })} onUrge={(order) => void handleUrgeOrder(order.order_no)} onDelete={(order) => openDialog({ type: "delete-user-order", orderNo: order.order_no })} /> : null}
        </div>
      ) : null}

      {activeTab === "seller" ? (
        <GlassPanel className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-muted-foreground" />{sellerSelf?.seller_id ? "我的店铺" : "申请开店"}</div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm text-muted-foreground">
              <div>店铺 ID：<span className="font-mono text-foreground">{sellerSelf?.seller_id ?? "未申请"}</span></div>
              <div className="mt-2">状态：<span className="font-medium text-foreground">{sellerStatusLabel(sellerSelf?.status)}</span></div>
              <div className="mt-2 leading-6">{sellerSelf?.status === "pass" ? "店铺已通过审核，可以正常经营。" : sellerSelf?.seller_id ? "店铺已提交，请关注审核状态。" : "提交店铺名称和简介后进入审核流程，申请时将扣除 3000 萝卜。"}</div>
            </div>
            <div className="grid gap-3">
              <input value={sellerForm.name} onChange={(event) => setSellerForm((current) => ({ ...current, name: event.target.value }))} maxLength={30} placeholder="店铺名称，30 字内" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              <textarea value={sellerForm.description} onChange={(event) => setSellerForm((current) => ({ ...current, description: event.target.value }))} maxLength={200} placeholder="店铺简介，200 字内" rows={4} className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
              {sellerSelf?.seller_id ? <TemporaryFileInput label="店铺封面 URL，可手填或上传文件" value={sellerForm.cover} emosId={user.user_id} accept="image/*" onChange={(value) => setSellerForm((current) => ({ ...current, cover: value }))} onMessage={setMessage} /> : null}
              {!sellerSelf?.seller_id ? <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-600 dark:text-amber-300">申请成为商户会扣除 3000 萝卜，提交前请确认余额与店铺信息。</div> : null}
              <button type="button" onClick={() => void handleSubmitSeller()} disabled={action === "seller"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">{action === "seller" ? "提交中" : sellerSelf?.seller_id ? "更新店铺" : "提交申请"}</button>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {activeTab === "categories" ? (
        <div className="space-y-4">
          <GlassPanel className="p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_auto]"><input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} maxLength={20} placeholder="分类名称，20 字内" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><input value={categoryForm.sort} onChange={(event) => setCategoryForm((current) => ({ ...current, sort: event.target.value }))} type="number" min={1} max={100} placeholder="排序" className="h-11 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><button type="button" onClick={() => void handleCreateCategory()} disabled={action === "category"} className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">新增分类</button></div></GlassPanel>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{merchantCategories.map((category) => <GlassPanel key={category.category_id} className="p-4"><div className="text-sm font-semibold">{category.name}</div><div className="mt-1 text-xs text-muted-foreground">排序 {category.sort}</div><div className="mt-4 flex gap-2"><button type="button" onClick={() => openDialog({ type: "sort-category", category }, String(category.sort))} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40">排序</button><button type="button" onClick={() => openDialog({ type: "delete-category", category })} className="h-9 rounded-full border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10">删除</button></div></GlassPanel>)}</div>
          {merchantCategories.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无分类</GlassPanel> : null}
        </div>
      ) : null}

      {activeTab === "manage-products" ? (
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassPanel ref={productFormRef} className="p-4 sm:p-5"><div className="text-sm font-semibold">{productForm.productId ? "编辑商品" : "创建商品"}</div>{merchantCategories.length === 0 ? <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">请先创建商品分类，再创建或编辑商品。</div> : null}<div className="mt-4 grid gap-3"><select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))} className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15"><option value="">选择分类</option>{merchantCategories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}</select><input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} maxLength={50} placeholder="商品名称，50 字内" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><TemporaryFileInput label="商品封面 URL，可手填或上传文件" value={productForm.cover} emosId={user.user_id} accept="image/*" onChange={(value) => setProductForm((current) => ({ ...current, cover: value }))} onMessage={setMessage} /><textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} maxLength={200} placeholder="商品简介，200 字内" rows={3} className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><textarea value={productForm.exchangeWay} onChange={(event) => setProductForm((current) => ({ ...current, exchangeWay: event.target.value }))} maxLength={1000} placeholder="兑换方式，1000 字内" rows={4} className="rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><div className="grid grid-cols-2 gap-3"><input value={productForm.price} onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))} type="number" min={1} max={50000} placeholder="价格" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><input value={productForm.priceOrigin} onChange={(event) => setProductForm((current) => ({ ...current, priceOrigin: event.target.value }))} type="number" min={1} max={50000} placeholder="原价" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><input value={productForm.stock} onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))} type="number" min={1} max={5000} placeholder="库存" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><input value={productForm.sort} onChange={(event) => setProductForm((current) => ({ ...current, sort: event.target.value }))} type="number" min={1} max={5000} placeholder="排序" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></div><div className="grid grid-cols-2 gap-3"><input value={productForm.timeStart} onChange={(event) => setProductForm((current) => ({ ...current, timeStart: event.target.value }))} type="datetime-local" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /><input value={productForm.timeEnd} onChange={(event) => setProductForm((current) => ({ ...current, timeEnd: event.target.value }))} type="datetime-local" className="h-11 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></div><label className="flex items-center gap-2 text-sm text-muted-foreground"><input checked={productForm.isUp} onChange={(event) => setProductForm((current) => ({ ...current, isUp: event.target.checked }))} type="checkbox" />上架商品</label><div className="flex gap-2"><button type="button" onClick={() => void handleSubmitProduct()} disabled={action === "product-submit" || merchantCategories.length === 0} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">{productForm.productId ? "保存商品" : "创建商品"}</button><button type="button" onClick={resetProductForm} className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 px-5 text-sm font-semibold hover:bg-muted/40">清空</button></div></div></GlassPanel>
          <div className="space-y-3">
            <MerchantProductFilters
              categories={merchantCategories}
              categoryId={merchantProductCategoryId}
              nameInput={merchantProductNameInput}
              status={merchantProductUp}
              loading={merchantProductStatus === "loading"}
              onCategoryChange={setMerchantProductCategoryId}
              onNameInputChange={setMerchantProductNameInput}
              onStatusChange={setMerchantProductUp}
              onSearch={() => {
                setMerchantProductPage(1);
                setMerchantProductName(merchantProductNameInput);
              }}
              onReset={() => {
                setMerchantProductPage(1);
                setMerchantProductCategoryId("");
                setMerchantProductNameInput("");
                setMerchantProductName("");
                setMerchantProductUp("");
              }}
            />
            <PaginationControls
              page={merchantProductPage}
              total={merchantProductTotal}
              pageSize={PAGE_SIZE}
              loading={merchantProductStatus === "loading"}
              onPageChange={setMerchantProductPage}
            />
            {merchantProductStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载商品中...</GlassPanel> : null}{merchantProducts.map((product) => <GlassPanel key={product.product_id} className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold">{product.name}</div><div className="mt-1 text-xs text-muted-foreground">{formatCarrot(product.price ?? product.price_origin)} · 库存 {product.stock} · 排序 {product.sort} · {product.is_up ? "已上架" : "已下架"}</div></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void handleEditProduct(product.product_id)} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40">编辑</button><button type="button" onClick={() => openDialog({ type: "toggle-product", product })} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40">{product.is_up ? "下架" : "上架"}</button><button type="button" onClick={() => openDialog({ type: "sort-product", product }, String(product.sort))} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold hover:bg-muted/40">排序</button><button type="button" onClick={() => openDialog({ type: "delete-product", product })} className="h-9 rounded-full border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10">删除</button></div></GlassPanel>)}{merchantProductStatus === "ready" && merchantProducts.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无商品</GlassPanel> : null}</div>
        </div>
      ) : null}

      {activeTab === "merchant-orders" ? (
        <div className="space-y-3">
          <MerchantOrderFilters
            searchInput={merchantOrderSearchInput}
            payStatus={merchantOrderPay}
            deliveryStatus={merchantOrderDelivery}
            loading={merchantOrderStatus === "loading"}
            onSearchInputChange={setMerchantOrderSearchInput}
            onPayStatusChange={setMerchantOrderPay}
            onDeliveryStatusChange={setMerchantOrderDelivery}
            onSearch={() => {
              setMerchantOrderPage(1);
              setMerchantOrderSearch(merchantOrderSearchInput);
            }}
            onReset={() => {
              setMerchantOrderPage(1);
              setMerchantOrderSearchInput("");
              setMerchantOrderSearch("");
              setMerchantOrderPay("");
              setMerchantOrderDelivery("");
            }}
          />
          <PaginationControls
            page={merchantOrderPage}
            total={merchantOrderTotal}
            pageSize={PAGE_SIZE}
            loading={merchantOrderStatus === "loading"}
            onPageChange={setMerchantOrderPage}
          />
          {merchantOrderStatus === "loading" ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">加载商户订单中...</GlassPanel> : null}
          {merchantOrderStatus === "ready" && merchantOrders.length === 0 ? <GlassPanel className="p-10 text-center text-sm text-muted-foreground">暂无商户订单</GlassPanel> : null}
          {merchantOrders.map((order) => <GlassPanel key={order.order_no} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-semibold">{order.order_title}</div><span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{statusLabel(order.status_pay)}</span><span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{order.time_delivery ? "已发货" : "未发货"}</span></div><div className="mt-2 text-xs text-muted-foreground">{order.order_no}</div><div className="mt-2 text-xs text-muted-foreground">数量 {order.buy_number} · {formatCarrot(order.price_order)} · 买家备注 {order.remark_user || "无"}</div>{order.remark_shop ? <div className="mt-2 text-xs text-muted-foreground">商户备注：{order.remark_shop}</div> : null}</div><div className="flex flex-wrap gap-2">{order.status_pay === "paid" && !order.time_delivery ? <button type="button" onClick={() => openDialog({ type: "deliver-order", orderNo: order.order_no })} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50">发货</button> : null}<button type="button" onClick={() => openDialog({ type: "remark-order", orderNo: order.order_no }, order.remark_shop || "")} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold hover:bg-muted/40 disabled:opacity-50">备注</button><button type="button" onClick={() => openDialog({ type: "delete-merchant-order", orderNo: order.order_no })} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full border border-danger/40 px-4 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">删除</button></div></div></GlassPanel>)}
        </div>
      ) : null}

      {selectedProduct || productDetailStatus === "loading" ? <ProductDetailModal selectedProduct={selectedProduct} productDetailStatus={productDetailStatus} buyNumber={buyNumber} remark={remark} action={action} onClose={() => setSelectedProduct(null)} onBuyNumberChange={setBuyNumber} onRemarkChange={setRemark} onCreateOrder={() => void handleCreateOrder()} /> : null}

      <ConfirmDialog
        open={pendingAction !== null}
        title={dialogTitle(pendingAction)}
        description={dialogDescription(pendingAction)}
        confirmLabel={dialogConfirmLabel(pendingAction)}
        confirmText={pendingAction?.type === "create-order" ? "确认下单" : pendingAction?.type === "pay-order" ? "确认支付" : undefined}
        inputLabel={pendingAction?.type === "sort-category" ? "分类排序，1-100" : pendingAction?.type === "sort-product" ? "商品排序，1-5000" : pendingAction?.type === "remark-order" ? "商户备注，200 字内" : undefined}
        inputValue={pendingAction?.type === "sort-category" || pendingAction?.type === "sort-product" || pendingAction?.type === "remark-order" ? dialogInput : undefined}
        inputType={pendingAction?.type === "sort-category" || pendingAction?.type === "sort-product" ? "number" : "text"}
        error={dialogError}
        loading={action !== "idle"}
        tone={dialogTone(pendingAction)}
        onInputChange={setDialogInput}
        onCancel={() => { setPendingAction(null); setDialogInput(""); setDialogError(""); }}
        onConfirm={() => {
          if (pendingAction?.type === "create-order") void submitCreateOrder(pendingAction.product, pendingAction.count);
          else if (pendingAction?.type === "pay-order") void submitPayOrder(pendingAction.orderNo);
          else if (pendingAction?.type === "close-order") void submitCloseOrder(pendingAction.orderNo);
          else if (pendingAction?.type === "delete-user-order") void submitDeleteUserOrder(pendingAction.orderNo);
          else if (pendingAction?.type === "delete-category") void submitDeleteCategory(pendingAction.category.category_id);
          else if (pendingAction?.type === "sort-category") void submitSortCategory(pendingAction.category.category_id);
          else if (pendingAction?.type === "delete-product") void submitDeleteProduct(pendingAction.product.product_id);
          else if (pendingAction?.type === "toggle-product") void submitToggleProduct(pendingAction.product.product_id);
          else if (pendingAction?.type === "sort-product") void submitSortProduct(pendingAction.product.product_id);
          else if (pendingAction?.type === "deliver-order") void submitDeliverOrder(pendingAction.orderNo);
          else if (pendingAction?.type === "remark-order") void submitRemarkOrder(pendingAction.orderNo);
          else if (pendingAction?.type === "delete-merchant-order") void submitDeleteMerchantOrder(pendingAction.orderNo);
        }}
      />
    </div>
  );
}

function UserOrderFilters({ searchInput, payStatus, deliveryStatus, loading, onSearchInputChange, onPayStatusChange, onDeliveryStatusChange, onSearch, onReset }: { searchInput: string; payStatus: string; deliveryStatus: string; loading: boolean; onSearchInputChange: (value: string) => void; onPayStatusChange: (value: string) => void; onDeliveryStatusChange: (value: string) => void; onSearch: () => void; onReset: () => void }) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px_130px_auto_auto]">
        <label className="relative block">
          <ReceiptText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchInput} onChange={(event) => onSearchInputChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} placeholder="搜索订单号或商品标题" className="h-10 w-full rounded-full border border-border/70 bg-background/50 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        </label>
        <select value={payStatus} onChange={(event) => onPayStatusChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">支付状态</option>
          <option value="paid">已支付</option>
          <option value="unpaid">待支付</option>
        </select>
        <select value={deliveryStatus} onChange={(event) => onDeliveryStatusChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">发货状态</option>
          <option value="1">已发货</option>
          <option value="0">未发货</option>
        </select>
        <button type="button" onClick={onSearch} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">筛选</button>
        <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold hover:bg-muted/40">重置</button>
      </div>
    </GlassPanel>
  );
}

function PaginationControls({ page, total, pageSize, loading, onPageChange }: { page: number; total: number; pageSize: number; loading: boolean; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>共 <span className="font-mono text-foreground">{total}</span> 条，当前 {start}-{end}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={loading || currentPage <= 1} className="h-9 rounded-full border border-border/70 px-3 font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50">上一页</button>
        <span className="font-mono text-foreground">{currentPage} / {totalPages}</span>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={loading || currentPage >= totalPages} className="h-9 rounded-full border border-border/70 px-3 font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50">下一页</button>
      </div>
    </div>
  );
}

function MerchantProductFilters({ categories, categoryId, nameInput, status, loading, onCategoryChange, onNameInputChange, onStatusChange, onSearch, onReset }: { categories: ShopCategory[]; categoryId: string; nameInput: string; status: string; loading: boolean; onCategoryChange: (value: string) => void; onNameInputChange: (value: string) => void; onStatusChange: (value: string) => void; onSearch: () => void; onReset: () => void }) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[160px_minmax(0,1fr)_150px_auto_auto]">
        <select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">全部分类</option>
          {categories.map((category) => <option key={category.category_id} value={category.category_id}>{category.name}</option>)}
        </select>
        <input value={nameInput} onChange={(event) => onNameInputChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} placeholder="搜索商品名" className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        <select value={status} onChange={(event) => onStatusChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">全部状态</option>
          <option value="1">已上架</option>
          <option value="0">已下架</option>
        </select>
        <button type="button" onClick={onSearch} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">筛选</button>
        <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold hover:bg-muted/40">重置</button>
      </div>
    </GlassPanel>
  );
}

function MerchantOrderFilters({ searchInput, payStatus, deliveryStatus, loading, onSearchInputChange, onPayStatusChange, onDeliveryStatusChange, onSearch, onReset }: { searchInput: string; payStatus: string; deliveryStatus: string; loading: boolean; onSearchInputChange: (value: string) => void; onPayStatusChange: (value: string) => void; onDeliveryStatusChange: (value: string) => void; onSearch: () => void; onReset: () => void }) {
  return (
    <GlassPanel className="p-4 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px_130px_auto_auto]">
        <input value={searchInput} onChange={(event) => onSearchInputChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSearch()} placeholder="搜索订单号或商品标题" className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none placeholder:text-muted-foreground/55 focus:border-primary/30 focus:ring-2 focus:ring-primary/15" />
        <select value={payStatus} onChange={(event) => onPayStatusChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">支付状态</option>
          <option value="paid">已支付</option>
          <option value="unpaid">待支付</option>
        </select>
        <select value={deliveryStatus} onChange={(event) => onDeliveryStatusChange(event.target.value)} className="h-10 rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15">
          <option value="">发货状态</option>
          <option value="1">已发货</option>
          <option value="0">未发货</option>
        </select>
        <button type="button" onClick={onSearch} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">筛选</button>
        <button type="button" onClick={onReset} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold hover:bg-muted/40">重置</button>
      </div>
    </GlassPanel>
  );
}

function OrderList({ orders, total, action, onPay, onClose, onUrge, onDelete }: { orders: ShopOrderItem[]; total: number; action: string; onPay: (order: ShopOrderItem) => void; onClose: (order: ShopOrderItem) => void; onUrge: (order: ShopOrderItem) => void; onDelete: (order: ShopOrderItem) => void }) {
  return (
    <>
      <div className="text-xs text-muted-foreground">共 <span className="font-mono text-foreground">{total}</span> 个订单</div>
      <div className="space-y-3">
        {orders.map((order) => <GlassPanel key={order.order_no} className="p-4 sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><div className="text-sm font-semibold">{order.order_title}</div><span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{statusLabel(order.status_pay)}</span></div><div className="mt-2 text-xs text-muted-foreground">{order.order_no}</div><div className="mt-2 text-xs text-muted-foreground">{order.seller.name} · 数量 {order.buy_number} · {formatCarrot(order.price_order)}</div></div><div className="flex flex-wrap gap-2">{order.status_pay === "unpaid" ? <><button type="button" onClick={() => onPay(order)} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">支付</button><button type="button" onClick={() => onClose(order)} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">关闭</button><button type="button" onClick={() => onDelete(order)} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full border border-danger/40 px-4 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">删除</button></> : null}{order.status_pay === "paid" && !order.time_delivery ? <button type="button" onClick={() => onUrge(order)} disabled={action === order.order_no} className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 px-4 text-xs font-semibold transition-colors hover:bg-muted/40 disabled:opacity-50">催发货</button> : null}</div></div></GlassPanel>)}
      </div>
    </>
  );
}

function ProductDetailModal({ selectedProduct, productDetailStatus, buyNumber, remark, action, onClose, onBuyNumberChange, onRemarkChange, onCreateOrder }: { selectedProduct: ShopProductInfo | null; productDetailStatus: "idle" | "loading" | "ready" | "error"; buyNumber: string; remark: string; action: string; onClose: () => void; onBuyNumberChange: (value: string) => void; onRemarkChange: (value: string) => void; onCreateOrder: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border/60 bg-background sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">商品详情</div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 transition-colors hover:bg-muted/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {productDetailStatus === "loading" ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />正在加载详情</div> : null}
          {selectedProduct ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
                {selectedProduct.cover_url ? <div role="img" aria-label={selectedProduct.name} className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.cover_url})` }} /> : <div className="flex aspect-[16/9] items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>}
              </div>
              <div>
                <div className="text-lg font-semibold">{selectedProduct.name}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{selectedProduct.description}</div>
              </div>
              <Link href={`/user/shop/${selectedProduct.seller.seller_id}`} onClick={onClose} className="group flex items-center gap-4 rounded-3xl border border-border/60 bg-muted/15 p-4 transition-colors hover:bg-muted/30">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-background/60">
                  {selectedProduct.seller.cover_url ? <span className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.seller.cover_url})` }} /> : <Store className="h-5 w-5 text-muted-foreground" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Seller</span>
                  <span className="mt-1 block truncate text-sm font-semibold text-foreground">{selectedProduct.seller.name}</span>
                  <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{selectedProduct.seller.description}</span>
                </span>
                <span className="shrink-0 rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:bg-background/60 group-hover:text-foreground">进店</span>
              </Link>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">价格</div><div className="mt-1 text-base font-semibold text-amber-500">{formatCarrot(selectedProduct.price ?? selectedProduct.price_origin)}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">库存</div><div className="mt-1 text-base font-semibold">{selectedProduct.stock}</div></div>
                <div className="rounded-2xl border border-border/50 bg-muted/10 p-4"><div className="text-xs text-muted-foreground">销量</div><div className="mt-1 text-base font-semibold">{selectedProduct.sales}</div></div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 text-sm leading-6 text-muted-foreground">{selectedProduct.exchange_way}</div>
              <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label><span className="mb-2 block text-xs text-muted-foreground">数量</span><input type="number" min="1" max="230" value={buyNumber} onChange={(event) => onBuyNumberChange(event.target.value)} className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></label>
                <label><span className="mb-2 block text-xs text-muted-foreground">备注</span><input value={remark} onChange={(event) => onRemarkChange(event.target.value.slice(0, 100))} placeholder="可选，100 字内" className="h-11 w-full rounded-full border border-border/70 bg-background/50 px-4 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15" /></label>
              </div>
              <button type="button" onClick={onCreateOrder} disabled={action === "create-order" || !selectedProduct.is_up} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">{action === "create-order" ? "提交中..." : "创建订单"}</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function dialogTitle(action: PendingShopAction) {
  if (action?.type === "create-order") return "确认创建订单";
  if (action?.type === "pay-order") return "确认支付订单";
  if (action?.type === "close-order") return "确认关闭订单";
  if (action?.type === "delete-user-order") return "确认删除订单";
  if (action?.type === "delete-category") return "确认删除分类";
  if (action?.type === "sort-category") return "修改分类排序";
  if (action?.type === "delete-product") return "确认删除商品";
  if (action?.type === "toggle-product") return action.product.is_up ? "确认下架商品" : "确认上架商品";
  if (action?.type === "sort-product") return "修改商品排序";
  if (action?.type === "deliver-order") return "确认发货";
  if (action?.type === "remark-order") return "添加商户备注";
  return "确认删除商户订单";
}

function dialogDescription(action: PendingShopAction) {
  if (action?.type === "create-order") return `将创建「${action.product.name}」× ${action.count} 的订单，合计 ${action.totalPrice} 萝卜。`;
  if (action?.type === "pay-order") return `将支付订单 ${action.orderNo}，扣除 ${action.price} 萝卜。`;
  if (action?.type === "close-order") return `将关闭订单 ${action.orderNo}，只有未支付订单可关闭。`;
  if (action?.type === "delete-user-order") return `将删除订单 ${action.orderNo}。`;
  if (action?.type === "delete-category") return `将删除分类「${action.category.name}」。`;
  if (action?.type === "sort-category") return `为分类「${action.category.name}」设置新的排序值。`;
  if (action?.type === "delete-product") return `将删除商品「${action.product.name}」。`;
  if (action?.type === "toggle-product") return `将${action.product.is_up ? "下架" : "上架"}商品「${action.product.name}」。`;
  if (action?.type === "sort-product") return `为商品「${action.product.name}」设置新的排序值。`;
  if (action?.type === "deliver-order") return `将订单 ${action.orderNo} 标记为已发货。`;
  if (action?.type === "remark-order") return `为订单 ${action.orderNo} 添加商户备注。`;
  if (action?.type === "delete-merchant-order") return `将删除商户订单 ${action.orderNo}。`;
  return undefined;
}

function dialogConfirmLabel(action: PendingShopAction) {
  if (action?.type === "pay-order" || action?.type === "create-order") return "确认提交";
  if (action?.type === "close-order") return "关闭订单";
  if (action?.type === "delete-user-order" || action?.type === "delete-category" || action?.type === "delete-product" || action?.type === "delete-merchant-order") return "删除";
  if (action?.type === "deliver-order") return "确认发货";
  if (action?.type === "remark-order") return "保存备注";
  return "确认";
}

function dialogTone(action: PendingShopAction) {
  return action?.type === "close-order" || action?.type === "delete-user-order" || action?.type === "delete-category" || action?.type === "delete-product" || action?.type === "delete-merchant-order" ? "danger" : "default";
}
