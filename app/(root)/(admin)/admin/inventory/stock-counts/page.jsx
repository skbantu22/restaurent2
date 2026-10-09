"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "#", label: "Stock Counts" },
];

const formSchema = z.object({
  locationId: z.string().trim().min(1, "Select a location"),
  varianceThresholdPercent: z.coerce.number().min(0).optional().default(5),
  notes: z.string().trim().optional().default(""),
});

export default function StockCountsPage() {
  const [stockCounts, setStockCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { locationId: "", varianceThresholdPercent: 5, notes: "" },
  });

  const load = async () => {
    setLoading(true);
    try {
      const [countsRes, locRes] = await Promise.all([
        axios.get("/api/admin/inventory/stock-counts"),
        axios.get("/api/admin/inventory/locations", { params: { active: "true" } }),
      ]);
      if (countsRes.data.success) setStockCounts(countsRes.data.data);
      if (locRes.data.success) setLocations(locRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/inventory/stock-counts", values);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Stock count started.");
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Counts</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Start Count
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && stockCounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No stock counts yet.
                  </TableCell>
                </TableRow>
              )}
              {stockCounts.map((count) => (
                <TableRow key={count._id}>
                  <TableCell>{count.location?.name || "-"}</TableCell>
                  <TableCell>{count.lines.length}</TableCell>
                  <TableCell>
                    <Badge variant={count.status === "OPEN" ? "secondary" : "default"}>
                      {count.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(count.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/inventory/stock-counts/${count._id}`}>
                      <Button size="sm" variant="outline">
                        {count.status === "OPEN" ? "Continue" : "View"}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Stock Count</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                        <option value="">Select a location...</option>
                        {locations.map((l) => (
                          <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="varianceThresholdPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variance Threshold (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Starts a count of every active ingredient, snapshotting today&apos;s expected stock.
                Lines that vary by more than this % will require a reason before you can submit.
              </p>
              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text="Start Count" />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
