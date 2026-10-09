"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { AlertTriangle, PackageX, PackageCheck, TrendingDown } from "lucide-react";
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "#", label: "Inventory" },
];

function StatCard({ label, value, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "text-foreground",
    danger: "text-red-600",
    warning: "text-amber-600",
  };

  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            {label}
          </p>
          <p className={`text-3xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 opacity-70 ${toneClasses[tone]}`} />
      </CardContent>
    </Card>
  );
}

export default function InventoryDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get("/api/admin/inventory/dashboard");
        if (!data.success) throw new Error(data.message);
        setSummary(data.data);
      } catch (error) {
        setErrorMsg(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />
      <h1 className="text-2xl font-bold">Inventory Dashboard</h1>

      {loading && <p className="text-muted-foreground">Loading...</p>}
      {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Ingredients" value={summary.totalIngredients} icon={PackageCheck} />
            <StatCard
              label="Inventory Value"
              value={`£${summary.totalInventoryValue.toFixed(2)}`}
              icon={PackageCheck}
            />
            <StatCard
              label="Low Stock"
              value={summary.lowStockCount}
              icon={AlertTriangle}
              tone="warning"
            />
            <StatCard
              label="Out of Stock"
              value={summary.outOfStockCount}
              icon={PackageX}
              tone="danger"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Low / Out of Stock
                  <Link
                    href="/admin/inventory/purchase-orders"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Create Purchase Order
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...summary.outOfStockItems, ...summary.lowStockItems].length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing low or out of stock.</p>
                )}
                {[...summary.outOfStockItems, ...summary.lowStockItems].map((item) => (
                  <div
                    key={item._id}
                    className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                  >
                    <span>{item.name}</span>
                    <span
                      className={
                        item.currentStock <= 0
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }
                    >
                      {item.currentStock} {item.usageUnit}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Recent Waste
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.recentWaste.length === 0 && (
                  <p className="text-sm text-muted-foreground">No waste recorded yet.</p>
                )}
                {summary.recentWaste.map((m) => (
                  <div
                    key={m._id}
                    className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                  >
                    <span>{m.ingredient?.name || "Unknown"}</span>
                    <span className="text-red-600">
                      -{Math.abs(m.normalizedQuantity)} ({m.reason})
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Stock Movements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.recentMovements.length === 0 && (
                <p className="text-sm text-muted-foreground">No stock movements yet.</p>
              )}
              {summary.recentMovements.map((m) => (
                <div
                  key={m._id}
                  className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                >
                  <span>
                    {m.ingredient?.name || "Unknown"}{" "}
                    <span className="text-muted-foreground">({m.type})</span>
                  </span>
                  <span className={m.normalizedQuantity < 0 ? "text-red-600" : "text-green-600"}>
                    {m.normalizedQuantity > 0 ? "+" : ""}
                    {m.normalizedQuantity}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
