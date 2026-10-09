"use client";

import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ShoppingBag,
  Tag,
  X,
  MapPin,
  LocateFixed,
  Loader2,
  ShieldCheck,
  ArrowRight,
  UtensilsCrossed,
  AlertCircle,
  PhoneCall,
  Navigation,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import { clearCart } from "@/store/reducer/cartReducer";

const formatCurrency = (amount) =>
  `£${Number(amount || 0).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Shawon Food Gate, 179 Forest Ln, London E7 9BB
const SHOP_CENTRE = {
  lat: 51.5484,
  lng: 0.0189,
};

// Haversine formula to calculate distance in miles
const calculateDistanceInMiles = (lat1, lon1, lat2, lon2) => {
  const R = 3958.8; // Radius of the earth in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CheckoutPage() {
  const dispatch = useDispatch();
  const cartStore = useSelector((store) => store.cartStore);
  const authStore = useSelector((store) => store.authStore);

  const isAdmin = authStore?.auth?.data?.user?.role === "admin";
  const products = Array.isArray(cartStore?.products) ? cartStore.products : [];

  const [placingOrder, setPlacingOrder] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [checkingDistance, setCheckingDistance] = useState(false);
  const [deliveryDistance, setDeliveryDistance] = useState(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [orderType, setOrderType] = useState("delivery");

  useEffect(() => {
    if (orderType === "delivery") {
      setPaymentMethod("stripe");
    }
  }, [orderType]);

  const [showLocationModal, setShowLocationModal] = useState(false);

  // Coupon states
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const subtotal = useMemo(
    () =>
      products.reduce(
        (acc, item) =>
          acc +
          Number(item?.sellingPrice || item?.price || 0) *
            Number(item?.quantity || 1),
        0,
      ),
    [products],
  );

  // The custom-meal builder's base-protein line (e.g. "Category:
  // Beef") is £0 and informational only — it's still sent to the
  // server as part of the order (so the kitchen sees the chosen
  // base), but it's not a purchasable line item, so it's hidden from
  // this customer-facing review list.
  const displayProducts = useMemo(
    () => products.filter((item) => !String(item?.productId || "").startsWith("category-")),
    [products],
  );

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return (subtotal * Number(appliedCoupon.discountPercentage)) / 100;
  }, [subtotal, appliedCoupon]);

  const shippingCost = orderType === "pickup" ? 0 : 3.99;
  const total = Math.max(0, subtotal - discountAmount) + shippingCost;

  const orderForm = useForm({
    resolver: zodResolver(
      zSchema.pick({ name: true, phone: true, address: true }),
    ),
    defaultValues: {
      name: authStore?.auth?.name || "",
      phone: authStore?.auth?.phone || "",
      address: authStore?.auth?.address || "",
    },
  });

  useEffect(() => {
    const currentAddress = orderForm.getValues("address");
    if (!currentAddress || currentAddress.trim() === "") {
      const timer = setTimeout(() => {
        setShowLocationModal(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const processCoordinates = async (lat, lng) => {
    const distance = calculateDistanceInMiles(
      SHOP_CENTRE.lat,
      SHOP_CENTRE.lng,
      lat,
      lng,
    );
    setDeliveryDistance(distance);

    if (orderType === "delivery" && distance > 5) {
      setIsOutOfRange(true);
    } else {
      setIsOutOfRange(false);
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        orderForm.setValue(
          "address",
          `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`,
          {
            shouldValidate: true,
          },
        );
        return;
      }

      const { data } = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
      );

      if (data.status === "OK" && data.results[0]) {
        orderForm.setValue("address", data.results[0].formatted_address, {
          shouldValidate: true,
        });
      }
    } catch (error) {
      console.error("Geocoding failed", error);
    }
  };

  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      showToast("error", "Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    setShowLocationModal(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await processCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        );
        setGettingLocation(false);
        showToast("success", "Location detected successfully!");
      },
      () => {
        setGettingLocation(false);
        showToast("error", "Location permission denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const verifyTypedAddress = async (addressText) => {
    if (!addressText || addressText.trim().length < 3) {
      setIsOutOfRange(false);
      setDeliveryDistance(null);
      return;
    }

    setCheckingDistance(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const isLocalTest = /forest gate|e7|e12|e6|e13|e15|e11|london/i.test(addressText);

      if (!apiKey) {
        setIsOutOfRange(orderType === "delivery" && !isLocalTest);
        setDeliveryDistance(isLocalTest ? 2.0 : 10.0);
        setCheckingDistance(false);
        return;
      }

      const { data } = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressText,
        )}&key=${apiKey}`,
      );

      if (data.status === "OK" && data.results[0]) {
        const location = data.results[0].geometry.location;
        const distance = calculateDistanceInMiles(
          SHOP_CENTRE.lat,
          SHOP_CENTRE.lng,
          location.lat,
          location.lng,
        );

        setDeliveryDistance(distance);
        if (orderType === "delivery" && distance > 5) {
          setIsOutOfRange(true);
        } else {
          setIsOutOfRange(false);
        }
      } else {
        if (isLocalTest) {
          setIsOutOfRange(false);
          setDeliveryDistance(2.0);
        } else {
          setIsOutOfRange(orderType === "delivery");
          setDeliveryDistance(10.0);
        }
      }
    } catch (error) {
      console.error("Geocoding error", error);
      const isLocalTest = /forest gate|e7|e12|e6|e13|e15|e11|london/i.test(addressText);
      setIsOutOfRange(orderType === "delivery" && !isLocalTest);
      setDeliveryDistance(isLocalTest ? 2.0 : 10.0);
    } finally {
      setCheckingDistance(false);
    }
  };

  const placeOrder = async (formData) => {
    if (products.length === 0) {
      showToast("error", "Cart is empty");
      return;
    }

    if (orderType === "delivery" && isOutOfRange) {
      showToast(
        "error",
        "Delivery is only available within 5 miles of Forest Gate.",
      );
      return;
    }

    setPlacingOrder(true);
    try {
      const payload = {
        paymentMethod,
        orderType,
        userId: authStore?.auth?._id || null,
        customer: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          cityId: "london",
        },
        items: products.map((item) => ({
          productId: item.productId || item._id,
          name: item.name || item.title || "",
          price: Number(item.price ?? item.sellingPrice ?? 0),
          sellingPrice: Number(item.sellingPrice ?? item.price ?? 0),
          quantity: Number(item.quantity || 1),
          image:
            item.image ||
            item.img ||
            item.thumbnail ||
            item.media?.[0]?.secure_url ||
            "",
          notes: item.notes || "",
          // Custom Meal bundle's nested burger/extra/drink selections —
          // the server re-prices each of these itself (see
          // /api/checkout's cleanSingleItem), never trusting this
          // client-sent breakdown as-is.
          ...(Array.isArray(item.items) ? { items: item.items } : {}),
        })),
        coupon: appliedCoupon
          ? {
              code: appliedCoupon.code,
              discountPercentage: appliedCoupon.discountPercentage,
              discountAmount: discountAmount,
            }
          : null,
      };

      const { data } = await axios.post("/api/checkout", payload);

      if (!data.success) throw new Error(data.message);

      // Clear the cart state in Redux and local storage
      dispatch(clearCart());

      if (data.url) {
        localStorage.setItem("live_order", data.orderId);
        window.location.href = data.url;
      } else {
        localStorage.setItem("live_order", data.orderId);
        window.location.href = `/order/success?orderId=${data.orderId}`;
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Payment failed");
      setPlacingOrder(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] min-h-screen py-10 text-zinc-900 relative">
      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-none">
          <div className="bg-white outline outline-1 outline-zinc-900 rounded-none w-full max-w-md p-8 text-center shadow-none relative">
            <button
              type="button"
              onClick={() => setShowLocationModal(false)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-zinc-100 outline outline-1 outline-zinc-900 flex items-center justify-center mx-auto mb-4 rounded-none">
              <Navigation className="w-6 h-6 text-zinc-900 animate-pulse" />
            </div>

            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-2">
              Enable Delivery Location
            </h3>
            <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
              We need your location to check if you are within our 5-mile
              delivery radius from Forest Gate and provide accurate delivery.
            </p>

            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleAutoDetectGPS}
                disabled={gettingLocation}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-none h-11 text-xs uppercase font-bold tracking-widest shadow-none"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                    Detecting...
                  </>
                ) : (
                  "Use Current Location"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationModal(false)}
                className="w-full outline outline-1 outline-zinc-900 bg-white text-zinc-900 hover:bg-zinc-100 rounded-none h-11 text-xs uppercase font-semibold tracking-widest shadow-none"
              >
                Enter Manually
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-light tracking-[0.2em] text-zinc-900 uppercase">
            Checkout
          </h1>
          <div className="w-12 h-[1px] bg-zinc-900 mx-auto mt-3"></div>
        </div>

        {orderType === "delivery" && isOutOfRange && (
          <div className="mb-6 p-5 bg-zinc-900 text-white outline outline-1 outline-zinc-900 rounded-none flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
              <div>
                <p className="font-bold text-xs uppercase tracking-widest">
                  Outside Delivery Radius (&gt;5 Miles)
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {deliveryDistance !== null
                    ? `Your entered address is ~${deliveryDistance.toFixed(1)} miles away from Forest Gate.`
                    : `Please enter an address within 5 miles of Forest Gate.`}
                </p>
              </div>
            </div>
            <a
              href="tel:+4466464654"
              className="whitespace-nowrap bg-white text-zinc-900 hover:bg-zinc-200 px-5 py-3 text-xs font-bold uppercase tracking-widest rounded-none flex items-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4" /> Contact: +4466464654
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Customer Form Column */}
          <div className="lg:col-span-7 bg-[#FAFAFA] p-6 sm:p-8 outline outline-1 outline-zinc-900 rounded-none shadow-none">
            <div className="flex items-center justify-between pb-4 outline-b outline-zinc-900 mb-6 border-b">
              <h2 className="text-xs font-bold text-zinc-900 tracking-widest uppercase">
                Customer Information
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDetectGPS}
                disabled={gettingLocation}
                className="outline outline-1 outline-zinc-900 bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white rounded-none h-9 text-xs uppercase font-semibold tracking-wider transition-colors shadow-none"
              >
                {gettingLocation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                ) : (
                  <LocateFixed className="w-3.5 h-3.5 mr-2" />
                )}
                Auto-Detect GPS
              </Button>
            </div>

            <Form {...orderForm}>
              <form
                id="checkout-form"
                onSubmit={orderForm.handleSubmit(placeOrder)}
                className="space-y-5"
              >
                <FormField
                  control={orderForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-[11px] font-bold uppercase text-zinc-900 tracking-widest">
                        Full Name *
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          className="outline outline-1 outline-zinc-900 rounded-none bg-white text-zinc-900 placeholder:text-zinc-400 h-11 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        />
                      </FormControl>
                      <FormMessage className="text-zinc-900 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orderForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-[11px] font-bold uppercase text-zinc-900 tracking-widest">
                        UK Phone Number *
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="+44 7123 456789"
                          {...field}
                          className="outline outline-1 outline-zinc-900 rounded-none bg-white text-zinc-900 placeholder:text-zinc-400 h-11 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        />
                      </FormControl>
                      <FormMessage className="text-zinc-900 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orderForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-[11px] font-bold uppercase text-zinc-900 tracking-widest">
                        Street Address & UK Postcode *
                      </Label>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-900" />
                          <Input
                            placeholder="Type postcode e.g. E8 1EB or address to test"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              verifyTypedAddress(e.target.value);
                            }}
                            className="outline outline-1 outline-zinc-900 rounded-none bg-white text-zinc-900 placeholder:text-zinc-400 h-11 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-zinc-900 text-xs font-medium" />
                    </FormItem>
                  )}
                />

                {checkingDistance && (
                  <div className="text-xs text-zinc-900 flex items-center gap-2 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking
                    distance from Forest Gate...
                  </div>
                )}
              </form>
            </Form>
          </div>

          {/* Order Summary & Payment Column */}
          <div className="lg:col-span-5 bg-[#FAFAFA] p-6 sm:p-8 outline outline-1 outline-zinc-900 rounded-none shadow-none h-fit">
            {/* Order Type Selection */}
            <div className="mb-6">
              <h3 className="text-[11px] font-bold uppercase mb-3 text-zinc-900 tracking-widest">
                Order Type
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`outline outline-1 outline-zinc-900 rounded-none p-3 text-xs uppercase font-bold tracking-wider transition ${
                    orderType === "delivery"
                      ? "bg-black text-white"
                      : "bg-white text-zinc-900"
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("pickup")}
                  className={`outline outline-1 outline-zinc-900 rounded-none p-3 text-xs uppercase font-bold tracking-wider transition ${
                    orderType === "pickup"
                      ? "bg-black text-white"
                      : "bg-white text-zinc-900"
                  }`}
                >
                  Pickup
                </button>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="text-[11px] font-bold uppercase mb-3 text-zinc-900 tracking-widest">
                Payment Method
              </h3>
              {orderType === "delivery" ? (
                <div className="p-3 bg-white outline outline-1 outline-zinc-900 rounded-none text-[11px] uppercase font-bold text-center text-zinc-900 tracking-wider">
                  Card Payment (Online)
                </div>
              ) : isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`outline outline-1 outline-zinc-900 rounded-none p-3 text-xs uppercase font-bold tracking-wider transition ${
                      paymentMethod === "stripe"
                        ? "bg-black text-white"
                        : "bg-white text-zinc-900"
                    }`}
                  >
                    Card Payment
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`outline outline-1 outline-zinc-900 rounded-none p-3 text-xs uppercase font-bold tracking-wider transition ${
                      paymentMethod === "cod"
                        ? "bg-black text-white"
                        : "bg-white text-zinc-900"
                    }`}
                  >
                    Cash
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-white outline outline-1 outline-zinc-900 rounded-none text-[11px] uppercase font-bold text-center text-zinc-900 tracking-wider">
                  Card Payment Only
                </div>
              )}
            </div>

            <h3 className="text-xs font-bold text-zinc-900 pb-4 outline-b outline-zinc-900 mb-5 flex justify-between tracking-widest uppercase border-b">
              <span>Order Summary</span>
              <span className="text-xs text-zinc-900 font-bold">
                {products.length} Items
              </span>
            </h3>

            {/* Products List */}
            <div className="max-h-56 overflow-y-auto space-y-3 mb-6 pr-2">
              {displayProducts.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm outline-b outline-zinc-900 pb-3 border-b"
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={
                        item.thumbnail ||
                        item.image ||
                        item.img ||
                        item.media?.[0]?.secure_url ||
                        item.media?.[0]?.url ||
                        item.media?.[0]?.thumbnail ||
                        item.media?.secure_url ||
                        item.media?.url ||
                        "/assets/img-placeholder.webp"
                      }
                      alt={item.title || item.name || "Product Image"}
                      className="w-11 h-11 object-cover outline outline-1 outline-zinc-900 rounded-none"
                    />
                    <div>
                      <p className="font-bold text-xs text-zinc-900 line-clamp-1 uppercase tracking-wider">
                        {item.name || item.title}
                      </p>
                      <p className="text-[11px] text-zinc-600 font-semibold mt-0.5">
                        QTY: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-xs text-zinc-900 tracking-wider">
                    {formatCurrency(
                      (item.sellingPrice || item.price || 0) * item.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Section */}
            <div className="mb-6">
              {appliedCoupon ? (
                <div className="flex justify-between items-center bg-white outline outline-1 outline-zinc-900 rounded-none p-3 text-xs">
                  <span className="uppercase text-zinc-900 font-bold tracking-widest">
                    {appliedCoupon.code} ({appliedCoupon.discountPercentage}%
                    OFF)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedCoupon(null)}
                    className="text-zinc-900 hover:text-zinc-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="COUPON CODE"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value)}
                    className="uppercase outline outline-1 outline-zinc-900 rounded-none bg-white text-zinc-900 placeholder:text-zinc-400 h-10 text-xs font-semibold tracking-wider focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!couponCodeInput.trim()) return;
                      setValidatingCoupon(true);
                      axios
                        .post("/api/coupons/verify", {
                          code: couponCodeInput.trim(),
                          subtotalAmount: subtotal,
                        })
                        .then(({ data }) => {
                          if (!data.success) throw new Error(data.message);
                          setAppliedCoupon(data.coupon);
                          showToast(
                            "success",
                            `Coupon "${data.coupon.code}" applied!`,
                          );
                          setCouponCodeInput("");
                        })
                        .catch((err) =>
                          showToast(
                            "error",
                            err.response?.data?.message || "Invalid coupon",
                          ),
                        )
                        .finally(() => setValidatingCoupon(false));
                    }}
                    disabled={validatingCoupon}
                    className="outline outline-1 outline-zinc-900 rounded-none bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white h-10 text-xs uppercase px-5 font-bold tracking-widest transition-colors shadow-none"
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* Totals Section */}
            <div className="space-y-2.5 text-xs text-zinc-900 font-semibold mb-6 tracking-wider">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span className="text-zinc-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-zinc-900">
                  <span>DISCOUNT</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {orderType === "delivery" && (
                <div className="flex justify-between">
                  <span>DELIVERY</span>
                  <span className="text-zinc-900">
                    {formatCurrency(shippingCost)}
                  </span>
                </div>
              )}
              <Separator className="bg-zinc-900 my-3 h-[1px]" />
              <div className="flex justify-between font-bold text-sm text-zinc-900 tracking-widest">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3 bg-white outline outline-1 outline-zinc-900 rounded-none flex items-center gap-3 mb-6">
              <ShieldCheck className="text-zinc-900 w-4 h-4 shrink-0" />
              <p className="text-[10px] text-zinc-900 font-semibold uppercase tracking-wider">
                {paymentMethod === "stripe"
                  ? "Secured & encrypted payment powered by Stripe."
                  : "Pay with cash upon order preparation/pickup."}
              </p>
            </div>

            {/* Place Order Button */}
            <Button
              form="checkout-form"
              type="submit"
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-none h-11 text-xs uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2 shadow-none"
              disabled={
                placingOrder ||
                products.length === 0 ||
                (orderType === "delivery" && isOutOfRange)
              }
            >
              {placingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : orderType === "delivery" && isOutOfRange ? (
                "Call: +4466464654 (Out of Range)"
              ) : paymentMethod === "stripe" ? (
                <>
                  Pay Now — {formatCurrency(total)}{" "}
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Place Order <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
