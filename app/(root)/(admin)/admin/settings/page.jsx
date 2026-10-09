"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { showToast } from "@/lib/showToast";
import ProfileSettings from "@/components/ui/Application/Admin/ProfileSettings";

const TABS = [
  { key: "profile", label: "My Profile" },
  { key: "general", label: "General" },
  { key: "business", label: "Business" },
  { key: "orders", label: "Orders & Receipt" },
  { key: "payments", label: "Payments" },
  { key: "marketing", label: "Marketing" },
];

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_FORM = {
  general: { name: "", logoUrl: "", address: "", phone: "", email: "" },
  business: {
    currencyCode: "GBP",
    currencySymbol: "£",
    taxRate: 0,
    deliveryFee: 0,
    minOrderAmount: 0,
    openingHours: DAYS.map((d) => ({ day: d.key, open: "09:00", close: "22:00", closed: false })),
  },
  orders: { posOrderPrefix: "SL-", receiptFooterText: "" },
  payments: { cashEnabled: true, cardEnabled: true },
};

const DEFAULT_MARKETING_FORM = {
  meta: { pixelId: "", accessToken: "", testEventCode: "", enabled: false },
  googleAds: { conversionId: "", conversionLabel: "", enabled: false },
};

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "border rounded-md px-3 py-2 w-full bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function RestaurantSettingsPage() {
  const [tab, setTab] = useState("general");

  // Deep link: /admin/settings?tab=profile (used by the top-bar avatar menu)
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested && TABS.some((t) => t.key === requested)) setTab(requested);
  }, []);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [marketingForm, setMarketingForm] = useState(DEFAULT_MARKETING_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await axios.get("/api/admin/settings");
        const settings = data?.data?.settings;

        if (settings) {
          const openingHours = DAYS.map((d) => {
            const existing = settings.business?.openingHours?.find((h) => h.day === d.key);
            return existing || { day: d.key, open: "09:00", close: "22:00", closed: false };
          });

          setForm({
            general: { ...DEFAULT_FORM.general, ...settings.general },
            business: { ...DEFAULT_FORM.business, ...settings.business, openingHours },
            orders: { ...DEFAULT_FORM.orders, ...settings.orders },
            payments: { ...DEFAULT_FORM.payments, ...settings.payments },
          });
        }
      } catch (error) {
        showToast("error", error?.response?.data?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }

    async function fetchMarketing() {
      try {
        const { data } = await axios.get("/api/admin/tracking");
        const settings = data?.data?.settings;

        if (settings) {
          setMarketingForm({
            meta: { ...DEFAULT_MARKETING_FORM.meta, ...settings.meta },
            googleAds: { ...DEFAULT_MARKETING_FORM.googleAds, ...settings.googleAds },
          });
        }
      } catch (error) {
        showToast("error", error?.response?.data?.message || "Failed to load marketing settings.");
      }
    }

    fetchSettings();
    fetchMarketing();
  }, []);

  const updateField = (section, field, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const updateOpeningHour = (day, field, value) => {
    setForm((prev) => ({
      ...prev,
      business: {
        ...prev.business,
        openingHours: prev.business.openingHours.map((h) =>
          h.day === day ? { ...h, [field]: value } : h,
        ),
      },
    }));
  };

  const updateMarketingField = (section, field, value) => {
    setMarketingForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/settings", form);
      if (data?.success) {
        showToast("success", "Settings saved successfully.");
      } else {
        showToast("error", data?.message || "Failed to save settings.");
      }
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMarketing = async () => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/tracking", marketingForm);
      if (data?.success) {
        showToast("success", "Marketing settings saved successfully.");
      } else {
        showToast("error", data?.message || "Failed to save marketing settings.");
      }
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Failed to save marketing settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl py-4">
      <h1 className="text-2xl font-bold mb-1">
        {tab === "profile" ? "My Profile" : "Restaurant Settings"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {tab === "profile"
          ? "Update your profile picture, name, contact details and password."
          : "Configure your restaurant's identity and business rules. These values are used across the POS, website checkout, receipts, and order notifications."}
      </p>

      <div className="flex gap-2 border-b mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-black dark:border-white"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileSettings />}

      {tab === "general" && (
        <div>
          <Field label="Restaurant Name">
            <input
              className={inputClass}
              value={form.general.name}
              onChange={(e) => updateField("general", "name", e.target.value)}
            />
          </Field>
          <Field label="Logo URL">
            <input
              className={inputClass}
              value={form.general.logoUrl}
              onChange={(e) => updateField("general", "logoUrl", e.target.value)}
            />
          </Field>
          <Field label="Address">
            <input
              className={inputClass}
              value={form.general.address}
              onChange={(e) => updateField("general", "address", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={inputClass}
              value={form.general.phone}
              onChange={(e) => updateField("general", "phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputClass}
              value={form.general.email}
              onChange={(e) => updateField("general", "email", e.target.value)}
            />
          </Field>
        </div>
      )}

      {tab === "business" && (
        <div>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Currency Code">
              <input
                className={inputClass}
                value={form.business.currencyCode}
                onChange={(e) => updateField("business", "currencyCode", e.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Currency Symbol">
              <input
                className={inputClass}
                value={form.business.currencySymbol}
                onChange={(e) => updateField("business", "currencySymbol", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <Field label="Delivery Fee">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.business.deliveryFee}
                onChange={(e) => updateField("business", "deliveryFee", Number(e.target.value))}
              />
            </Field>
            <Field label="Minimum Order Amount">
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputClass}
                value={form.business.minOrderAmount}
                onChange={(e) => updateField("business", "minOrderAmount", Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="Tax Rate (%) — for reporting only, does not change checkout totals">
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              className={inputClass}
              value={form.business.taxRate}
              onChange={(e) => updateField("business", "taxRate", Number(e.target.value))}
            />
          </Field>

          <h3 className="font-semibold mt-6 mb-2">Opening Hours</h3>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const hour = form.business.openingHours.find((h) => h.day === d.key);
              return (
                <div key={d.key} className="flex items-center gap-3 flex-wrap">
                  <span className="w-24 text-sm">{d.label}</span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={hour.closed}
                      onChange={(e) => updateOpeningHour(d.key, "closed", e.target.checked)}
                    />
                    Closed
                  </label>
                  {!hour.closed && (
                    <>
                      <input
                        type="time"
                        className="border rounded-md px-2 py-1 bg-transparent"
                        value={hour.open}
                        onChange={(e) => updateOpeningHour(d.key, "open", e.target.value)}
                      />
                      <span className="text-sm">to</span>
                      <input
                        type="time"
                        className="border rounded-md px-2 py-1 bg-transparent"
                        value={hour.close}
                        onChange={(e) => updateOpeningHour(d.key, "close", e.target.value)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div>
          <Field label="POS Order Number Prefix">
            <input
              className={inputClass}
              value={form.orders.posOrderPrefix}
              onChange={(e) => updateField("orders", "posOrderPrefix", e.target.value)}
            />
          </Field>
          <Field label="Receipt Footer Text">
            <input
              className={inputClass}
              value={form.orders.receiptFooterText}
              onChange={(e) => updateField("orders", "receiptFooterText", e.target.value)}
            />
          </Field>
        </div>
      )}

      {tab === "payments" && (
        <div>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={form.payments.cashEnabled}
              onChange={(e) => updateField("payments", "cashEnabled", e.target.checked)}
            />
            Accept Cash
          </label>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={form.payments.cardEnabled}
              onChange={(e) => updateField("payments", "cardEnabled", e.target.checked)}
            />
            Accept Card (Stripe)
          </label>
        </div>
      )}

      {tab === "marketing" && (
        <div>
          <h3 className="font-semibold mb-2">Facebook / Meta Ads</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Powers the Meta Pixel + Conversions API already live on the website
            (product views, add-to-cart, checkout, and purchase events).
          </p>

          <Field label="Pixel ID">
            <input
              className={inputClass}
              value={marketingForm.meta.pixelId}
              onChange={(e) => updateMarketingField("meta", "pixelId", e.target.value)}
              placeholder="e.g. 1234567890123456"
            />
          </Field>
          <Field label="Access Token (Conversions API)">
            <input
              type="password"
              className={inputClass}
              value={marketingForm.meta.accessToken}
              onChange={(e) => updateMarketingField("meta", "accessToken", e.target.value)}
              placeholder="From Meta Events Manager → Settings → Conversions API"
            />
          </Field>
          <Field label="Test Event Code (optional)">
            <input
              className={inputClass}
              value={marketingForm.meta.testEventCode}
              onChange={(e) => updateMarketingField("meta", "testEventCode", e.target.value)}
              placeholder="For verifying events in Meta's Test Events tab"
            />
          </Field>
          <label className="flex items-center gap-2 mb-6">
            <input
              type="checkbox"
              checked={marketingForm.meta.enabled}
              onChange={(e) => updateMarketingField("meta", "enabled", e.target.checked)}
            />
            Enable Meta Pixel + Conversions API
          </label>

          <h3 className="font-semibold mb-2">Google Ads</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Fires a standard gtag conversion event when an order completes
            (website checkout only, not POS in-store sales).
          </p>

          <Field label="Conversion ID">
            <input
              className={inputClass}
              value={marketingForm.googleAds.conversionId}
              onChange={(e) => updateMarketingField("googleAds", "conversionId", e.target.value)}
              placeholder="AW-XXXXXXXXX"
            />
          </Field>
          <Field label="Conversion Label">
            <input
              className={inputClass}
              value={marketingForm.googleAds.conversionLabel}
              onChange={(e) => updateMarketingField("googleAds", "conversionLabel", e.target.value)}
              placeholder="From the conversion action's tag setup in Google Ads"
            />
          </Field>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={marketingForm.googleAds.enabled}
              onChange={(e) => updateMarketingField("googleAds", "enabled", e.target.checked)}
            />
            Enable Google Ads conversion tracking
          </label>
        </div>
      )}

      {tab !== "profile" && (
        <button
          onClick={tab === "marketing" ? handleSaveMarketing : handleSave}
          disabled={saving}
          className="bg-black text-white dark:bg-white dark:text-black px-5 py-2 rounded-md mt-4 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      )}
    </div>
  );
}
