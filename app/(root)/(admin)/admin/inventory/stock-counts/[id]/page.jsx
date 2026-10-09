"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showToast } from "@/lib/showToast";

export default function StockCountDetailPage({ params }) {
  const { id } = use(params);

  const [count, setCount] = useState(null);
  const [entries, setEntries] = useState({}); // ingredientId -> { actualStock, reason }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/inventory/stock-counts/${id}`);
      if (data.success) setCount(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setEntry = (ingredientId, field, value) => {
    setEntries((prev) => ({ ...prev, [ingredientId]: { ...prev[ingredientId], [field]: value } }));
  };

  const saveEntries = async () => {
    const payload = Object.entries(entries)
      .filter(([, v]) => v.actualStock !== undefined && v.actualStock !== "")
      .map(([ingredient, v]) => ({
        ingredient,
        actualStock: Number(v.actualStock),
        reason: v.reason || "",
      }));

    if (payload.length === 0) {
      showToast("error", "Enter at least one counted quantity.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.patch(`/api/admin/inventory/stock-counts/${id}`, {
        entries: payload,
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", "Count entries saved.");
      setEntries({});
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/admin/inventory/stock-counts/${id}/submit`);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Stock count submitted. Adjustments applied.");
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !count) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const breadcrumbData = [
    { href: ADMIN_DASHBOARD, label: "Home" },
    { href: "/admin/inventory", label: "Inventory" },
    { href: "/admin/inventory/stock-counts", label: "Stock Counts" },
    { href: "#", label: count.location?.name || "Count" },
  ];

  const isOpen = count.status === "OPEN";

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Count — {count.location?.name}</h1>
          <p className="text-sm text-muted-foreground">
            Variance threshold: {count.varianceThresholdPercent}%
          </p>
        </div>
        <Badge variant={isOpen ? "secondary" : "default"} className="text-sm">
          {count.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ingredient | Expected | Actual | Variance | Cost Impact | Reason
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Cost Impact</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {count.lines.map((line) => {
                const draft = entries[line.ingredient._id] || {};
                const actualValue =
                  draft.actualStock !== undefined ? draft.actualStock : line.actualStock ?? "";
                const variance =
                  actualValue === "" || actualValue === null
                    ? null
                    : Number(actualValue) - line.expectedStock;
                const costImpact = variance === null ? null : variance * line.unitCostSnapshot;
                const variancePct =
                  variance === null || line.expectedStock === 0
                    ? 0
                    : (Math.abs(variance) / line.expectedStock) * 100;
                const needsReason = variancePct > count.varianceThresholdPercent && variance !== 0;

                return (
                  <TableRow key={line.ingredient._id}>
                    <TableCell>{line.ingredient.name}</TableCell>
                    <TableCell>{line.expectedStock} {line.ingredient.usageUnit}</TableCell>
                    <TableCell>
                      {isOpen ? (
                        <Input
                          type="number"
                          step="any"
                          className="w-28"
                          value={actualValue}
                          onChange={(e) => setEntry(line.ingredient._id, "actualStock", e.target.value)}
                        />
                      ) : (
                        `${line.actualStock ?? "-"}`
                      )}
                    </TableCell>
                    <TableCell className={variance < 0 ? "text-red-600" : variance > 0 ? "text-green-600" : ""}>
                      {variance === null ? "-" : variance}
                    </TableCell>
                    <TableCell>{costImpact === null ? "-" : `£${costImpact.toFixed(2)}`}</TableCell>
                    <TableCell>
                      {isOpen ? (
                        <Input
                          placeholder={needsReason ? "Required (>threshold)" : "Optional"}
                          className={`w-48 ${needsReason ? "border-red-400" : ""}`}
                          value={draft.reason !== undefined ? draft.reason : line.reason || ""}
                          onChange={(e) => setEntry(line.ingredient._id, "reason", e.target.value)}
                        />
                      ) : (
                        line.reason || "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isOpen && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={saveEntries} disabled={busy}>Save Entries</Button>
          <Button onClick={submit} disabled={busy}>Submit Count</Button>
        </div>
      )}
    </div>
  );
}
