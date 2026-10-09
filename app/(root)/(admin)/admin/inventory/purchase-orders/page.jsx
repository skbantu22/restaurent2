"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

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
  { href: "#", label: "Purchase Orders" },
];

const UNITS = ["kg", "g", "l", "ml", "pcs"];

const STATUS_STYLES = {
  DRAFT: "outline",
  SENT: "secondary",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "default",
  CANCELLED: "destructive",
};

const formSchema = z.object({
  supplier: z.string().trim().min(1, "Select a supplier"),
  vatRate: z.coerce.number().min(0).max(100).optional().default(0),
  notes: z.string().trim().optional().default(""),
  items: z
    .array(
      z.object({
        ingredient: z.string().trim().min(1, "Select an ingredient"),
        orderedQuantity: z.coerce.number().positive(),
        purchaseUnit: z.enum(UNITS),
        purchasePrice: z.coerce.number().min(0),
      }),
    )
    .min(1, "Add at least one item"),
});

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier: "",
      vatRate: 20,
      notes: "",
      items: [{ ingredient: "", orderedQuantity: 1, purchaseUnit: "kg", purchasePrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const load = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, ingRes] = await Promise.all([
        axios.get("/api/admin/inventory/purchase-orders"),
        axios.get("/api/admin/inventory/suppliers", { params: { active: "true" } }),
        axios.get("/api/admin/inventory/ingredients", { params: { active: "true", limit: 500 } }),
      ]);
      if (poRes.data.success) setPurchaseOrders(poRes.data.data);
      if (supRes.data.success) setSuppliers(supRes.data.data);
      if (ingRes.data.success) setIngredients(ingRes.data.data.ingredients || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    form.reset({
      supplier: "",
      vatRate: 20,
      notes: "",
      items: [{ ingredient: "", orderedQuantity: 1, purchaseUnit: "kg", purchasePrice: 0 }],
    });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/inventory/purchase-orders", values);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Purchase order created as DRAFT.");
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
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> New Purchase Order
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
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
              {!loading && purchaseOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No purchase orders yet.
                  </TableCell>
                </TableRow>
              )}
              {purchaseOrders.map((po) => (
                <TableRow key={po._id}>
                  <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                  <TableCell>{po.supplier?.companyName || "-"}</TableCell>
                  <TableCell>£{po.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_STYLES[po.status] || "default"}>{po.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/inventory/purchase-orders/${po._id}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                          <option value="">Select a supplier...</option>
                          {suppliers.map((s) => (
                            <option key={s._id} value={s._id}>{s.companyName}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Items</FormLabel>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      append({ ingredient: "", orderedQuantity: 1, purchaseUnit: "kg", purchasePrice: 0 })
                    }
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Line
                  </Button>
                </div>

                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-start border rounded-md p-3">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.ingredient`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                                <option value="">Ingredient...</option>
                                {ingredients.map((ing) => (
                                  <option key={ing._id} value={ing._id}>{ing.name}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.orderedQuantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="any" placeholder="Qty" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.purchaseUnit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                                {UNITS.map((u) => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.purchasePrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" step="any" placeholder="£/unit" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex items-center h-9">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text="Create Draft" />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
