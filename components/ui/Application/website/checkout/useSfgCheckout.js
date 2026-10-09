"use client";

// Shared checkout state + actions for both checkout designs
// (SfgCheckout = card layout, SfgCheckoutWizard = step-by-step layout).
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { showToast } from "@/lib/showToast";
import { clearCart } from "@/store/reducer/cartReducer";

export const SHOP = { lat: 51.5484, lng: 0.0189 }; // 179 Forest Ln, London E7 9BB
export const MAX_MILES = 5;
export const LOCAL_RE = /forest gate|e7|e12|e6|e13|e15|e11|london/i;

export const money = (n) => `£${Number(n || 0).toFixed(2)}`;
export const priceOf = (it) => Number(it?.sellingPrice ?? it?.price ?? 0);
export const imageOf = (it) => it?.image || it?.img || it?.media?.[0]?.secure_url || it?.media?.[0]?.url || "";

export function milesBetween(a, b) {
  const R = 3958.8;
  const r = (d) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 15-minute slots from now (+30 min prep) until 23:45, London time
export function timeSlots() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const start = new Date(now.getTime() + 30 * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const slots = [];
  const t = new Date(start);
  if (t.getHours() < 8) t.setHours(8, 0, 0, 0);
  while (t.getDate() === now.getDate() && (t.getHours() < 23 || (t.getHours() === 23 && t.getMinutes() <= 45))) {
    slots.push(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
    t.setMinutes(t.getMinutes() + 15);
  }
  return slots;
}


export default function useSfgCheckout({ theme = "dark", successBase = "" } = {}) {
  const t = { successBase };
  const dispatch = useDispatch();
  const products = useSelector((s) => (Array.isArray(s.cartStore?.products) ? s.cartStore.products : []));
  const auth = useSelector((s) => s.authStore?.auth);
  const user = auth?.data?.user || auth?.user || auth || {};

  const [orderType, setOrderType] = useState("delivery");
  const [payment, setPayment] = useState("stripe");
  const [when, setWhen] = useState("asap");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", postcode: "", notes: "", orderNotes: "" });
  const [errors, setErrors] = useState({});
  const [deliveryFee, setDeliveryFee] = useState(3.99);
  const [distance, setDistance] = useState(null);
  const [checking, setChecking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [canceled, setCanceled] = useState(false);

  useEffect(() => {
    setSlots(timeSlots());
    setCanceled(new URLSearchParams(window.location.search).has("canceled"));
    setForm((f) => ({
      ...f,
      name: f.name || user?.name || "",
      phone: f.phone || user?.phone || "",
      email: f.email || user?.email || "",
      address: f.address || user?.address || "",
    }));
    axios
      .get("/api/settings/public")
      .then(({ data }) => data?.success && setDeliveryFee(Number(data.data.deliveryFee ?? 3.99)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (orderType === "delivery" && payment === "cod") setPayment("stripe");
  }, [orderType, payment]);

  const lines = products.filter((it) => !String(it?.productId || "").startsWith("category-"));
  const itemCount = lines.reduce((n, it) => n + Number(it.quantity || 1), 0);
  const subtotal = useMemo(() => products.reduce((s, it) => s + priceOf(it) * Number(it.quantity || 1), 0), [products]);
  const discount = coupon ? (subtotal * Number(coupon.discountPercentage || 0)) / 100 : 0;
  const fee = orderType === "pickup" ? 0 : deliveryFee;
  const total = Math.max(0, subtotal - discount) + fee;
  const outOfRange = orderType === "delivery" && distance !== null && distance > MAX_MILES;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function checkAddress(text) {
    if (!text || text.trim().length < 3) return setDistance(null);
    setChecking(true);
    try {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key) return setDistance(LOCAL_RE.test(text) ? 2 : 10);
      const { data } = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(`${text}, UK`)}&key=${key}`,
      );
      const loc = data?.results?.[0]?.geometry?.location;
      setDistance(loc ? milesBetween(SHOP, loc) : LOCAL_RE.test(text) ? 2 : 10);
    } catch {
      setDistance(LOCAL_RE.test(text) ? 2 : 10);
    } finally {
      setChecking(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return showToast("error", "Location is not supported on this device.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const here = { lat: coords.latitude, lng: coords.longitude };
        setDistance(milesBetween(SHOP, here));
        try {
          const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (key) {
            const { data } = await axios.get(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${here.lat},${here.lng}&key=${key}`,
            );
            const r = data?.results?.[0];
            if (r) {
              const pc = r.address_components?.find((c) => c.types.includes("postal_code"))?.long_name || "";
              setForm((f) => ({ ...f, address: r.formatted_address, postcode: pc || f.postcode }));
            }
          }
        } catch {}
        setLocating(false);
        showToast("success", "Location found");
      },
      () => {
        setLocating(false);
        showToast("error", "Location permission was denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const { data } = await axios.post("/api/coupons/verify", { code: couponInput.trim(), subtotalAmount: subtotal });
      if (!data.success) throw new Error(data.message);
      setCoupon(data.coupon);
      setCouponInput("");
      showToast("success", `Coupon ${data.coupon.code} applied`);
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message || "Invalid coupon");
    } finally {
      setCouponBusy(false);
    }
  }

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name";
    if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Please enter a valid UK phone number";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Please check your email";
    if (orderType === "delivery") {
      if (form.address.trim().length < 3) e.address = "Please enter your delivery address";
      if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(form.postcode.trim())) e.postcode = "Please enter a valid postcode, e.g. E7 9BB";
    }
    if (when === "scheduled" && !slot) e.slot = "Please choose a time";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function placeOrder() {
    if (!lines.length) return showToast("error", "Your basket is empty");
    if (!validate()) return showToast("error", "Please check the highlighted details");
    if (outOfRange) return showToast("error", `Sorry, we only deliver within ${MAX_MILES} miles of Forest Gate.`);

    setPlacing(true);
    try {
      const timing = when === "asap" ? "ASAP" : `Scheduled for ${slot}`;
      const payload = {
        theme: theme === "light" ? "demo-2" : "",
        paymentMethod: payment,
        orderType,
        userId: auth?._id || user?._id || user?.id || null,
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: orderType === "delivery" ? form.address.trim() : "",
          postcode: orderType === "delivery" ? form.postcode.trim().toUpperCase() : "",
          city: "London",
          cityId: "london",
          notes: form.notes.trim(),
          orderNotes: [`${orderType === "pickup" ? "Collection" : "Delivery"}: ${timing}`, form.orderNotes.trim()]
            .filter(Boolean)
            .join(" · "),
        },
        items: products.map((it) => ({
          productId: it.productId || it._id,
          name: it.name || it.title || "",
          price: priceOf(it),
          sellingPrice: priceOf(it),
          quantity: Number(it.quantity || 1),
          image: imageOf(it),
          notes: it.notes || "",
          ...(Array.isArray(it.items) ? { items: it.items } : {}),
        })),
        coupon: coupon
          ? { code: coupon.code, discountPercentage: coupon.discountPercentage, discountAmount: discount }
          : null,
      };

      const { data } = await axios.post("/api/checkout", payload);
      if (!data.success) throw new Error(data.message);

      localStorage.setItem("live_order", data.orderId);
      dispatch(clearCart());
      window.location.href = data.url || `${t.successBase}/order/success?orderId=${data.orderId}`;
    } catch (err) {
      showToast("error", err.response?.data?.message || err.message || "Could not place your order");
      setPlacing(false);
    }
  }


  return { dispatch, products, lines, itemCount, subtotal, discount, fee, total, outOfRange, orderType, setOrderType, payment, setPayment, when, setWhen, slot, setSlot, slots, form, set, errors, setErrors, deliveryFee, distance, checking, locating, couponInput, setCouponInput, coupon, setCoupon, couponBusy, placing, canceled, checkAddress, useMyLocation, applyCoupon, placeOrder };
}
