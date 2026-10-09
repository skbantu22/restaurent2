"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "#", label: "Reports" },
];

function foodCostTone(pct) {
  if (pct === null) return "outline";
  if (pct <= 30) return "default";
  if (pct <= 35) return "secondary";
  return "destructive";
}

export default function RecipeCostingReportPage() {
  const [costings, setCostings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get("/api/admin/inventory/costing");
        if (data.success) setCostings(data.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <h1 className="text-2xl font-bold">Recipe Costing Report</h1>
      <p className="text-sm text-muted-foreground">
        Ingredient Cost + Packaging Cost = Total Cost · Selling Price − Total Cost = Gross Profit ·
        Total Cost / Selling Price = Food Cost %. Only products with an active recipe are listed —
        add a recipe under Inventory → Recipes for anything missing here.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Ingredient Cost</TableHead>
                <TableHead>Packaging Cost</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Gross Profit</TableHead>
                <TableHead>Food Cost %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && costings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No products have an active recipe yet.
                  </TableCell>
                </TableRow>
              )}
              {costings.map((c) => (
                <TableRow key={c.productId}>
                  <TableCell className="font-medium">{c.productName}</TableCell>
                  <TableCell>£{c.sellingPrice.toFixed(2)}</TableCell>
                  <TableCell>£{c.ingredientCost.toFixed(2)}</TableCell>
                  <TableCell>£{c.packagingCost.toFixed(2)}</TableCell>
                  <TableCell>£{c.totalCost.toFixed(2)}</TableCell>
                  <TableCell className={c.grossProfit < 0 ? "text-red-600" : "text-green-600"}>
                    £{c.grossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {c.foodCostPercent === null ? (
                      "-"
                    ) : (
                      <Badge variant={foodCostTone(c.foodCostPercent)}>{c.foodCostPercent}%</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
