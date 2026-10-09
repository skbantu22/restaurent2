"use client";

import React from "react";
import Barcode from "react-barcode";

// Barcode value for a menu product: its SKU when set, otherwise a stable
// code built from the product id (Code128 accepts letters and digits).
export const barcodeValue = (product) =>
  product.sku?.trim() || `SL${String(product._id).slice(-8).toUpperCase()}`;

const PRINT_LOGO = "/assets/logo-print.png";

export default function BarcodeLabel({ product }) {
  return (
    <div className="barcode-label flex flex-col items-center justify-between rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PRINT_LOGO} alt="S'Mashed LDN" className="h-7 w-auto object-contain" />
      <div className="mt-1.5 w-full text-center">
        <p className="line-clamp-1 text-[13px] font-bold leading-tight">{product.name}</p>
        {product.category && (
          <p className="line-clamp-1 text-[10px] text-zinc-500">{product.category}</p>
        )}
      </div>
      <div className="my-1">
        <Barcode
          value={barcodeValue(product)}
          width={1.3}
          height={42}
          displayValue
          fontSize={11}
          margin={0}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>
      <p className="text-base font-extrabold leading-none">
        £{Number(product.sellingPrice || product.mrp || 0).toFixed(2)}
      </p>
    </div>
  );
}
