"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useSelector } from "react-redux";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Loader2,
  User,
  Clock,
  Printer,
  ChefHat,
  Eye,
  CheckCircle2,
  X,
} from "lucide-react";
import { showToast } from "@/lib/showToast";

const ORDER_TYPES = [
  { value: "pickup", label: "Collection" },
  { value: "delivery", label: "Delivery" },
];

const ALLOWED_ROLES = ["admin", "manager", "staff"];

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pos-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function POSPage() {
  const user = useSelector((state) => state.authStore.auth);
  const role = user?.data?.user?.role;
  const roleLoaded = user !== null;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);

  const [orderType, setOrderType] = useState("pickup");
  const [selectedCustomer, setSelectedCustomer] = useState(null); // {userId?, name, phone, email}
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [showCustomerPanel, setShowCustomerPanel] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState({ address: "", city: "", postcode: "" });
  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [successOrder, setSuccessOrder] = useState(null);

  const [showRecentOrders, setShowRecentOrders] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(false);

  // Real configured delivery fee (falls back to the model's own default
  // while loading, so the preview is never wildly wrong).
  const [configuredDeliveryFee, setConfiguredDeliveryFee] = useState(3.99);

  const customerName = selectedCustomer?.name || "";
  const customerPhone = selectedCustomer?.phone || "";

  // ---------------- FETCH MENU ----------------
  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get("/api/category", { params: { deleteType: "SD", size: 200 } }),
        axios.get("/api/product", { params: { deleteType: "SD", size: 1000 } }),
      ]);

      if (catRes.data.success) setCategories(catRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data || prodRes.data.products || []);
    } catch {
      showToast("error", "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    axios
      .get("/api/pos/customers/recent")
      .then(({ data }) => data.success && setRecentCustomers(data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    axios
      .get("/api/settings/public")
      .then(({ data }) => {
        if (data.success && typeof data.data?.deliveryFee === "number") {
          setConfiguredDeliveryFee(data.data.deliveryFee);
        }
      })
      .catch(() => {}); // preview falls back to the default — server is authoritative anyway
  }, []);

  // Debounced customer search
  const searchDebounce = useRef(null);
  useEffect(() => {
    if (customerQuery.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      try {
        const { data } = await axios.get("/api/pos/customers/search", {
          params: { q: customerQuery.trim() },
        });
        if (data.success) setCustomerResults(data.data);
      } catch {
        // silent — search is a convenience, not required to place an order
      }
    }, 300);
    return () => clearTimeout(searchDebounce.current);
  }, [customerQuery]);

  const loadRecentOrders = async () => {
    setRecentOrdersLoading(true);
    try {
      const { data } = await axios.get("/api/pos/recent-orders");
      if (data.success) setRecentOrders(data.data);
    } finally {
      setRecentOrdersLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
      const q = search.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
      const isVisible = p.posVisible !== false;
      return matchesCategory && matchesSearch && isVisible;
    });
  }, [products, selectedCategory, search]);

  // ---------------- CART ----------------
  const addToCart = (product) => {
    if (product.available === false || product.active === false) {
      showToast("error", `${product.name} is currently unavailable.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.sellingPrice || 0,
          image: product.media?.[0]?.url || "",
          quantity: 1,
          notes: "",
          modifiers: [], // reserved extension point — no modifier UI yet
        },
      ];
    });
  };

  const changeQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const setItemNotes = (productId, notes) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, notes } : i)));
  };

  const clearOrder = () => {
    setCart([]);
    setDiscountType("fixed");
    setDiscountValue(0);
    setOrderNotes("");
    setCashReceived("");
    setSelectedCustomer(null);
    setCustomerQuery("");
    setIdempotencyKey(newIdempotencyKey());
  };

  // ---------------- TOTALS (client-side preview only — the server
  // recalculates everything authoritatively from real product prices) ----------------
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = orderType === "delivery" ? configuredDeliveryFee : 0;
  const discountPreview =
    discountType === "percentage"
      ? subtotal * (Math.min(Math.max(Number(discountValue) || 0, 0), 100) / 100)
      : Math.min(Math.max(Number(discountValue) || 0, 0), subtotal);
  const total = Math.max(subtotal + deliveryFee - discountPreview, 0);
  const changeDue =
    paymentMethod === "cash" && cashReceived !== "" ? Number(cashReceived) - total : null;

  const canSubmit =
    cart.length > 0 &&
    !submitting &&
    (paymentMethod !== "cash" || (cashReceived !== "" && Number(cashReceived) >= total)) &&
    (orderType !== "delivery" || deliveryAddress.address.trim() !== "");

  const placeOrder = async () => {
    if (!canSubmit) return;

    // Must open synchronously, before the first await — browsers block
    // window.open() called after an async gap from the click that
    // triggered it (they no longer trust it as user-initiated), which
    // was silently swallowing the kitchen ticket print entirely. Opening
    // a blank tab now and pointing it at the real URL once the order
    // comes back keeps it inside the trusted click.
    const kitchenTicketWindow = window.open("", "_blank");

    setSubmitting(true);
    try {
      const { data } = await axios.post("/api/pos/checkout", {
        orderType,
        customer: {
          userId: selectedCustomer?.userId || null,
          name: customerName || "Walk-in Customer",
          phone: customerPhone || "N/A",
          email: selectedCustomer?.email || "",
        },
        deliveryAddress: orderType === "delivery" ? deliveryAddress : undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, notes: i.notes })),
        discountType,
        discountValue: Number(discountValue) || 0,
        notes: orderNotes,
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? Number(cashReceived) : undefined,
        idempotencyKey,
      });

      if (!data.success) throw new Error(data.message);

      setSuccessOrder(data.data.order);

      // Kitchen needs the ticket immediately, not after a staff member
      // remembers to click it in the confirmation modal.
      if (kitchenTicketWindow) {
        kitchenTicketWindow.location.href = `/admin/orders/print/${data.data.order._id}?type=kitchen`;
      }

      clearOrder();
    } catch (error) {
      kitchenTicketWindow?.close();
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoaded && !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold">Access denied</h2>
          <p className="text-muted-foreground text-sm mt-2">
            The POS is restricted to admin, manager, and staff accounts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-96px)] flex flex-col gap-3">
      {/* ORDER TYPE TABS */}
      <div className="flex gap-2 flex-wrap items-center">
        {ORDER_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setOrderType(t.value)}
            className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
              orderType === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-input hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}

        <button
          onClick={() => {
            setShowRecentOrders(true);
            loadRecentOrders();
          }}
          className="px-3 py-2 rounded-md text-sm font-medium border border-input hover:bg-muted flex items-center gap-1.5"
        >
          <Clock className="w-4 h-4" /> Recent Orders
        </button>

        {role && (
          <span className="ml-auto text-xs text-muted-foreground self-center">
            Signed in as {user?.data?.user?.name || "Staff"} ({role})
          </span>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[180px_1fr_380px] gap-3 min-h-0">
        {/* LEFT: CATEGORIES */}
        <div className="border rounded-md overflow-y-auto bg-card">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-4 py-3 text-sm font-medium border-b ${
              !selectedCategory ? "bg-muted" : "hover:bg-muted/50"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`w-full text-left px-4 py-3 text-sm font-medium border-b ${
                selectedCategory === cat._id ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* CENTER: MENU */}
        <div className="border rounded-md flex flex-col min-h-0 bg-card">
          <div className="p-3 border-b flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu by name or SKU..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
            {loading && (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
              </div>
            )}
            {!loading && filteredProducts.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-10 text-sm">
                No menu items found.
              </p>
            )}
            {filteredProducts.map((product) => {
              const unavailable = product.available === false || product.active === false;
              return (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  disabled={unavailable}
                  className={`relative border rounded-md p-3 text-left transition-colors bg-background ${
                    unavailable
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:border-primary"
                  }`}
                >
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted mb-2">
                    {product.media?.[0]?.url && (
                      <Image
                        src={product.media[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p className="text-sm font-semibold line-clamp-2">{product.name}</p>
                  <p className="text-sm text-primary font-bold">£{(product.sellingPrice || 0).toFixed(2)}</p>
                  <span
                    className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      unavailable ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {unavailable ? "Out of stock" : "Available"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: CART */}
        <div className="border rounded-md flex flex-col min-h-0 bg-card">
          <div className="p-3 border-b font-semibold text-sm flex items-center justify-between">
            Current Order
            {cart.length > 0 && (
              <button onClick={clearOrder} className="text-xs text-red-500 hover:underline">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
            )}
            {cart.map((item) => (
              <div key={item.productId} className="border rounded-md p-2 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  <button onClick={() => removeItem(item.productId)} className="text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(item.productId, -1)}
                      className="w-6 h-6 flex items-center justify-center border rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => changeQty(item.productId, 1)}
                      className="w-6 h-6 flex items-center justify-center border rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold">£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    value={item.notes}
                    onChange={(e) => setItemNotes(item.productId, e.target.value)}
                    placeholder="Item note (e.g. no onions)"
                    className="flex-1 text-xs border rounded px-2 py-1 bg-background"
                  />
                  <button
                    type="button"
                    disabled
                    title="Add-ons / modifiers coming soon"
                    className="text-[10px] px-2 py-1 border rounded text-muted-foreground opacity-50 cursor-not-allowed"
                  >
                    + Add-ons
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t p-3 space-y-2 text-sm">
            {/* CUSTOMER */}
            <div className="relative">
              {selectedCustomer ? (
                <div className="flex items-center justify-between border rounded px-2 py-1.5 bg-muted/40">
                  <span className="text-sm">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    {selectedCustomer.name} · {selectedCustomer.phone}
                  </span>
                  <button onClick={() => setSelectedCustomer(null)} className="text-muted-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onFocus={() => setShowCustomerPanel(true)}
                  onBlur={() => setTimeout(() => setShowCustomerPanel(false), 150)}
                  placeholder="Search customer or type new name/phone..."
                  className="w-full border rounded px-2 py-1.5 bg-background"
                />
              )}

              {showCustomerPanel && !selectedCustomer && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg max-h-56 overflow-y-auto">
                  {customerResults.length > 0 && (
                    <>
                      <p className="px-2 pt-2 text-[10px] uppercase text-muted-foreground font-bold">Matches</p>
                      {customerResults.map((c) => (
                        <button
                          key={c._id}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() =>
                            setSelectedCustomer({ userId: c._id, name: c.name, phone: c.phone, email: c.email })
                          }
                        >
                          {c.name} · {c.phone}
                        </button>
                      ))}
                    </>
                  )}
                  {customerQuery.trim().length < 2 && recentCustomers.length > 0 && (
                    <>
                      <p className="px-2 pt-2 text-[10px] uppercase text-muted-foreground font-bold">Recent</p>
                      {recentCustomers.map((c) => (
                        <button
                          key={c._id}
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
                          onClick={() => setSelectedCustomer({ name: c.name, phone: c.phone, email: c.email })}
                        >
                          {c.name} · {c.phone}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {!selectedCustomer && customerQuery.trim() !== "" && (
              <div className="grid grid-cols-1 gap-2">
                <button
                  className="text-xs text-left text-primary hover:underline"
                  onClick={() =>
                    setSelectedCustomer({ name: customerQuery.trim(), phone: "N/A", email: "" })
                  }
                >
                  Use &quot;{customerQuery.trim()}&quot; as walk-in name →
                </button>
              </div>
            )}

            {orderType === "delivery" && (
              <input
                value={deliveryAddress.address}
                onChange={(e) => setDeliveryAddress((p) => ({ ...p, address: e.target.value }))}
                placeholder="Delivery address *"
                className="w-full border rounded px-2 py-1.5 bg-background"
              />
            )}
            <input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Order notes"
              className="w-full border rounded px-2 py-1.5 bg-background"
            />

            <div className="flex justify-between"><span>Subtotal</span><span>£{subtotal.toFixed(2)}</span></div>
            {deliveryFee > 0 && (
              <div className="flex justify-between"><span>Delivery</span><span>£{deliveryFee.toFixed(2)}</span></div>
            )}
            <div className="flex justify-between items-center gap-2">
              <span>Discount</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiscountType(discountType === "fixed" ? "percentage" : "fixed")}
                  className="text-xs border rounded px-1.5 py-1 font-semibold w-7"
                  title="Toggle £ / %"
                >
                  {discountType === "fixed" ? "£" : "%"}
                </button>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 border rounded px-2 py-1 text-right bg-background"
                />
              </div>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span><span>£{total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2">
              {["cash", "card"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold border capitalize ${
                    paymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "border-input"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-1">
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 10, 20, 50]
                    .filter((note) => note >= total)
                    .slice(0, 3)
                    .map((note) => (
                      <button
                        key={note}
                        type="button"
                        onClick={() => setCashReceived(String(note))}
                        className="flex-1 min-w-14 py-1.5 rounded text-xs font-semibold border border-input hover:bg-muted"
                      >
                        £{note}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => setCashReceived(total.toFixed(2))}
                    className="flex-1 min-w-14 py-1.5 rounded text-xs font-semibold border border-input hover:bg-muted"
                  >
                    Exact
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="Cash received"
                  className="w-full border rounded px-2 py-1.5 bg-background"
                />
                {changeDue !== null && (
                  <p className={`text-xs ${changeDue < 0 ? "text-red-500" : "text-green-600"}`}>
                    {changeDue < 0 ? "Insufficient cash" : `Change due: £${changeDue.toFixed(2)}`}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-md font-bold text-sm bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Place Order — £{total.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {/* SUCCESS SCREEN */}
      {successOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-sm w-full p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">Order Confirmed</h2>
            <div className="text-sm text-left border rounded-md p-3 space-y-1 bg-muted/30">
              <p><b>Order #:</b> {successOrder.orderNumber}</p>
              <p><b>Customer:</b> {successOrder.customer?.name}</p>
              <p><b>Type:</b> {successOrder.orderType}</p>
              <p><b>Payment:</b> {successOrder.payment?.method}</p>
              <p><b>Total:</b> £{successOrder.total.toFixed(2)}</p>
              {successOrder.payment?.method === "cash" && (
                <p><b>Change due:</b> £{Number(successOrder.payment.changeDue || 0).toFixed(2)}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/admin/orders/print/${successOrder._id}?type=receipt`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 border rounded-md py-2 text-sm hover:bg-muted"
              >
                <Printer className="w-4 h-4" /> Receipt
              </a>
              <a
                href={`/admin/orders/print/${successOrder._id}?type=kitchen`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 border rounded-md py-2 text-sm hover:bg-muted"
              >
                <ChefHat className="w-4 h-4" /> Kitchen Ticket
              </a>
              <Link
                href={`/admin/all-orders/details/${successOrder._id}`}
                className="flex items-center justify-center gap-1.5 border rounded-md py-2 text-sm hover:bg-muted"
              >
                <Eye className="w-4 h-4" /> View Order
              </Link>
              <button
                onClick={() => setSuccessOrder(null)}
                className="flex items-center justify-center gap-1.5 rounded-md py-2 text-sm bg-primary text-primary-foreground"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECENT ORDERS DRAWER */}
      {showRecentOrders && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-background w-full max-w-md h-full p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Recent POS Orders</h3>
              <button onClick={() => setShowRecentOrders(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {recentOrdersLoading && <Loader2 className="animate-spin w-5 h-5 text-muted-foreground" />}
            {!recentOrdersLoading && recentOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">No POS orders yet.</p>
            )}
            {recentOrders.map((o) => (
              <Link
                key={o._id}
                href={`/admin/all-orders/details/${o._id}`}
                className="block border rounded-md p-3 hover:bg-muted text-sm"
              >
                <div className="flex justify-between font-semibold">
                  <span>{o.orderNumber}</span>
                  <span>£{o.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{o.customer?.name} · {o.orderType}</span>
                  <span>{o.orderStatus}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(o.createdAt).toLocaleString("en-GB")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
