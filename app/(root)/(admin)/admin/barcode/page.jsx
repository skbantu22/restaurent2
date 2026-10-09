"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BarcodeLabel, { barcodeValue } from "@/components/ui/Application/Admin/BarcodeLabel";
import {
  Check,
  Loader2,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";

const LAYOUTS = {
  a4: { label: "A4 sheet (3 per row)", columns: 3, page: "A4", width: "auto" },
  thermal: { label: "Label printer 80mm (1 per row)", columns: 1, page: "80mm auto", width: "80mm" },
};

const BarcodePrintPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]); // [{ product, qty }]
  const [layout, setLayout] = useState("a4");

  useEffect(() => {
    axios
      .get("/api/product?size=1000")
      .then(({ data }) => {
        if (data?.success) setProducts(data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(q),
    );
  }, [search, products]);

  const isSelected = (id) => selected.some((s) => s.product._id === id);

  const toggleProduct = (product) => {
    setSelected((prev) =>
      prev.some((s) => s.product._id === product._id)
        ? prev.filter((s) => s.product._id !== product._id)
        : [...prev, { product, qty: 1 }],
    );
  };

  const setQty = (id, qty) => {
    const value = Math.max(1, Math.min(100, Number(qty) || 1));
    setSelected((prev) =>
      prev.map((s) => (s.product._id === id ? { ...s, qty: value } : s)),
    );
  };

  const labels = useMemo(
    () => selected.flatMap((s) => Array.from({ length: s.qty }, () => s.product)),
    [selected],
  );

  const current = LAYOUTS[layout];

  return (
    <div className="py-4">
      {/* Print only the label sheet, in the chosen layout. Overrides the
          global receipt print rules (80mm #receipt) for this page. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #barcode-labels, #barcode-labels * { visibility: visible !important; }
          #barcode-labels {
            display: grid !important;
            position: absolute; left: 0; top: 0;
            width: ${current.width === "auto" ? "100%" : current.width};
            grid-template-columns: repeat(${current.columns}, 1fr);
            gap: 4mm; padding: 4mm;
          }
          #barcode-labels .barcode-label { break-inside: avoid; page-break-inside: avoid; }
          @page { size: ${current.page}; margin: 6mm; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Barcode Print</h1>
          <p className="text-sm text-muted-foreground">
            Pick menu items, set how many labels you need, then print.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {Object.entries(LAYOUTS).map(([key, l]) => (
              <option key={key} value={key}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            disabled={labels.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print {labels.length > 0 ? `${labels.length} label${labels.length > 1 ? "s" : ""}` : "labels"}
          </button>
        </div>
      </div>

      <div className="no-print grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Product picker */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category or SKU..."
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No products found.</p>
            ) : (
              filtered.map((p) => {
                const added = isSelected(p._id);
                const img = p.media?.[0]?.thumbnail || p.media?.[0]?.url;
                return (
                  <button
                    key={p._id}
                    onClick={() => toggleProduct(p)}
                    className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition last:border-b-0 ${
                      added ? "bg-orange-50 dark:bg-orange-500/10" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.category || "No category"} · {barcodeValue(p)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      £{Number(p.sellingPrice || p.mrp || 0).toFixed(2)}
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                        added ? "border-orange-500 bg-orange-500 text-white" : "text-muted-foreground"
                      }`}
                    >
                      {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected + preview */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-bold">Selected ({selected.length})</h2>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {selected.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Click products on the left to add them.
              </p>
            ) : (
              <ul className="divide-y">
                {selected.map(({ product, qty }) => (
                  <li key={product._id} className="flex items-center gap-2 px-4 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                    <div className="flex items-center rounded-md border">
                      <button
                        onClick={() => setQty(product._id, qty - 1)}
                        className="p-1.5 hover:text-orange-600"
                        aria-label="Fewer labels"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={qty}
                        onChange={(e) => setQty(product._id, e.target.value)}
                        className="w-10 bg-transparent text-center text-sm outline-none"
                      />
                      <button
                        onClick={() => setQty(product._id, qty + 1)}
                        className="p-1.5 hover:text-orange-600"
                        aria-label="More labels"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => toggleProduct(product)}
                      className="p-1.5 text-muted-foreground hover:text-red-600"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 text-sm font-bold">Label preview</h2>
              <div className="flex justify-center rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
                <BarcodeLabel product={selected[0].product} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printed sheet (hidden on screen) */}
      <div id="barcode-labels" className="hidden">
        {labels.map((product, i) => (
          <BarcodeLabel key={`${product._id}-${i}`} product={product} />
        ))}
      </div>
    </div>
  );
};

export default BarcodePrintPage;
