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

const STATUS_STYLES = {
  DRAFT: "outline",
  SENT: "secondary",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

export default function PurchaseOrderDetailPage({ params }) {
  const { id } = use(params);

  const [po, setPo] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [receiveQty, setReceiveQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [poRes, locRes] = await Promise.all([
        axios.get(`/api/admin/inventory/purchase-orders/${id}`),
        axios.get("/api/admin/inventory/locations", { params: { active: "true" } }),
      ]);
      if (poRes.data.success) setPo(poRes.data.data);
      if (locRes.data.success) {
        setLocations(locRes.data.data);
        const def = locRes.data.data.find((l) => l.isDefault) || locRes.data.data[0];
        if (def) setLocationId(def._id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/admin/inventory/purchase-orders/${id}/send`);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Purchase order sent.");
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(`/api/admin/inventory/purchase-orders/${id}/cancel`);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Purchase order cancelled.");
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  const receive = async () => {
    if (!locationId) {
      showToast("error", "Select a location to receive into.");
      return;
    }

    const lines = po.items
      .map((item) => ({
        ingredient: item.ingredient._id,
        quantityReceived: Number(receiveQty[item.ingredient._id] || 0),
      }))
      .filter((l) => l.quantityReceived > 0);

    if (lines.length === 0) {
      showToast("error", "Enter a quantity to receive for at least one item.");
      return;
    }

    setBusy(true);
    try {
      const { data } = await axios.post(`/api/admin/inventory/purchase-orders/${id}/receive`, {
        locationId,
        lines,
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", "Goods received.");
      setReceiveQty({});
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !po) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const breadcrumbData = [
    { href: ADMIN_DASHBOARD, label: "Home" },
    { href: "/admin/inventory", label: "Inventory" },
    { href: "/admin/inventory/purchase-orders", label: "Purchase Orders" },
    { href: "#", label: po.poNumber },
  ];

  const canReceive = ["SENT", "PARTIALLY_RECEIVED"].includes(po.status);

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{po.poNumber}</h1>
          <p className="text-sm text-muted-foreground">{po.supplier?.companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_STYLES[po.status] || "default"} className="text-sm">
            {po.status}
          </Badge>
          {po.status === "DRAFT" && (
            <Button size="sm" onClick={send} disabled={busy}>Send to Supplier</Button>
          )}
          {["DRAFT", "SENT", "PARTIALLY_RECEIVED"].includes(po.status) && (
            <Button size="sm" variant="destructive" onClick={cancel} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Unit Price</TableHead>
                {canReceive && <TableHead>Receive Now</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => {
                const remaining = item.orderedQuantity - item.receivedQuantity;
                return (
                  <TableRow key={item.ingredient._id}>
                    <TableCell>{item.ingredient.name}</TableCell>
                    <TableCell>{item.orderedQuantity} {item.purchaseUnit}</TableCell>
                    <TableCell>{item.receivedQuantity} {item.purchaseUnit}</TableCell>
                    <TableCell>£{item.purchasePrice.toFixed(2)}</TableCell>
                    {canReceive && (
                      <TableCell>
                        {remaining > 0 ? (
                          <Input
                            type="number"
                            step="any"
                            max={remaining}
                            placeholder={`up to ${remaining}`}
                            className="w-32"
                            value={receiveQty[item.ingredient._id] || ""}
                            onChange={(e) =>
                              setReceiveQty((prev) => ({ ...prev, [item.ingredient._id]: e.target.value }))
                            }
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Fully received</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canReceive && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receive Goods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-1">
              <label className="text-sm font-medium">Receiving Location</label>
              <select
                className="w-full border rounded-md h-9 px-2 text-sm bg-background"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Select location...</option>
                {locations.map((l) => (
                  <option key={l._id} value={l._id}>{l.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={receive} disabled={busy}>Confirm Receipt</Button>
            <p className="text-xs text-muted-foreground">
              Supports partial delivery — enter only what has actually arrived. Stock and cost
              are updated immediately and recorded on the stock ledger.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div><span className="text-muted-foreground">Subtotal:</span> £{po.subtotal.toFixed(2)}</div>
        <div><span className="text-muted-foreground">VAT:</span> £{po.vatAmount.toFixed(2)}</div>
        <div className="font-semibold"><span className="text-muted-foreground font-normal">Total:</span> £{po.total.toFixed(2)}</div>
      </div>
    </div>
  );
}
