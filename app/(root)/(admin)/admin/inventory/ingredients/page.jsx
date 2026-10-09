"use client";

import { useEffect, useState } from "react";
import axios from "axios";
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
  { href: "#", label: "Ingredients" },
];

const UNITS = ["kg", "g", "l", "ml", "pcs"];

const createSchema = z.object({
  ingredientCode: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().optional().default(""),
  purchaseUnit: z.enum(UNITS),
  usageUnit: z.enum(UNITS),
  conversionFactor: z.coerce.number().positive(),
  minimumStock: z.coerce.number().min(0).optional().default(0),
  parLevel: z.coerce.number().min(0).optional().default(0),
  maximumStock: z.coerce.number().min(0).optional().default(0),
  currentStock: z.coerce.number().min(0).optional().default(0),
});

const STATUS_STYLES = {
  OUT_OF_STOCK: "destructive",
  LOW_STOCK: "secondary",
  OVERSTOCKED: "outline",
  OK: "default",
};

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      ingredientCode: "",
      name: "",
      category: "",
      purchaseUnit: "kg",
      usageUnit: "kg",
      conversionFactor: 1,
      minimumStock: 0,
      parLevel: 0,
      maximumStock: 0,
      currentStock: 0,
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/inventory/stock", {
        params: { activeOnly: "false" },
      });
      if (data.success) setIngredients(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    form.reset({
      ingredientCode: "",
      name: "",
      category: "",
      purchaseUnit: "kg",
      usageUnit: "kg",
      conversionFactor: 1,
      minimumStock: 0,
      parLevel: 0,
      maximumStock: 0,
      currentStock: 0,
    });
    setOpen(true);
  };

  const openEdit = (ingredient) => {
    setEditing(ingredient);
    form.reset({
      ingredientCode: ingredient.ingredientCode,
      name: ingredient.name,
      category: ingredient.category || "",
      purchaseUnit: ingredient.purchaseUnit,
      usageUnit: ingredient.usageUnit,
      conversionFactor: ingredient.conversionFactor,
      minimumStock: ingredient.minimumStock,
      parLevel: ingredient.parLevel,
      maximumStock: ingredient.maximumStock,
      currentStock: ingredient.currentStock,
    });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        // currentStock is not editable directly — see Ingredient PATCH route.
        // Stock corrections belong in Stock Counts / Waste / Purchases.
        const { currentStock, ...editable } = values;
        const { data } = await axios.patch(
          `/api/admin/inventory/ingredients/${editing._id}`,
          editable,
        );
        if (!data.success) throw new Error(data.message);
      } else {
        const { data } = await axios.post("/api/admin/inventory/ingredients", values);
        if (!data.success) throw new Error(data.message);
      }
      showToast("success", editing ? "Ingredient updated." : "Ingredient created.");
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ingredient) => {
    try {
      if (ingredient.active) {
        await axios.delete(`/api/admin/inventory/ingredients/${ingredient._id}`);
      } else {
        await axios.patch(`/api/admin/inventory/ingredients/${ingredient._id}`, { active: true });
      }
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    }
  };

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.ingredientCode.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add Ingredient
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Avg Cost</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No ingredients found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((ingredient) => (
                <TableRow key={ingredient._id}>
                  <TableCell className="font-medium">{ingredient.name}</TableCell>
                  <TableCell className="font-mono text-xs">{ingredient.ingredientCode}</TableCell>
                  <TableCell>
                    {ingredient.currentStock} {ingredient.usageUnit}
                  </TableCell>
                  <TableCell>£{(ingredient.averageCost || 0).toFixed(2)}</TableCell>
                  <TableCell>£{(ingredient.stockValue || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_STYLES[ingredient.status] || "default"}>
                      {ingredient.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(ingredient)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(ingredient)}>
                      {ingredient.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ingredientCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="BEEF-PATTY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Beef Patty" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Protein / Dairy / Produce / Packaging" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Unit</FormLabel>
                      <FormControl>
                        <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="usageUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Unit</FormLabel>
                      <FormControl>
                        <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conversionFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>1 Purchase = ? Usage</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!editing && (
                <FormField
                  control={form.control}
                  name="currentStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Stock (usage unit)</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Par Level</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maximumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {editing && (
                <p className="text-xs text-muted-foreground">
                  Current stock ({editing.currentStock} {editing.usageUnit}) can only be changed
                  via a Stock Count, Purchase, or Waste entry — not edited directly here.
                </p>
              )}

              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text={editing ? "Save Changes" : "Add Ingredient"} />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
