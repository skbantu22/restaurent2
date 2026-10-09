"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  { href: "#", label: "Waste" },
];

const UNITS = ["kg", "g", "l", "ml", "pcs"];

const formSchema = z.object({
  ingredientId: z.string().trim().min(1, "Select an ingredient"),
  locationId: z.string().trim().min(1, "Select a location"),
  quantity: z.coerce.number().positive(),
  unit: z.enum(UNITS),
  reason: z.string().trim().min(1, "A reason is required"),
  notes: z.string().trim().optional().default(""),
});

export default function WastePage() {
  const [wasteData, setWasteData] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { ingredientId: "", locationId: "", quantity: 1, unit: "kg", reason: "", notes: "" },
  });

  const load = async () => {
    setLoading(true);
    try {
      const [wasteRes, ingRes, locRes] = await Promise.all([
        axios.get("/api/admin/inventory/waste"),
        axios.get("/api/admin/inventory/ingredients", { params: { active: "true", limit: 500 } }),
        axios.get("/api/admin/inventory/locations", { params: { active: "true" } }),
      ]);
      if (wasteRes.data.success) setWasteData(wasteRes.data.data);
      if (ingRes.data.success) setIngredients(ingRes.data.data.ingredients || []);
      if (locRes.data.success) setLocations(locRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    form.reset({ ingredientId: "", locationId: "", quantity: 1, unit: "kg", reason: "", notes: "" });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = await axios.post("/api/admin/inventory/waste", values);
      if (!data.success) throw new Error(data.message);
      showToast("success", "Waste recorded.");
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
        <h1 className="text-2xl font-bold">Waste Management</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Record Waste
        </Button>
      </div>

      {wasteData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Today</p>
              <p className="text-2xl font-bold mt-1">£{wasteData.summary.wasteToday.cost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">This Week</p>
              <p className="text-2xl font-bold mt-1">£{wasteData.summary.wasteThisWeek.cost.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">This Month</p>
              <p className="text-2xl font-bold mt-1">£{wasteData.summary.wasteThisMonth.cost.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {wasteData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Top Wasted Ingredients</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wasteData.summary.topWastedIngredients.length === 0 && (
                <p className="text-sm text-muted-foreground">No waste recorded yet.</p>
              )}
              {wasteData.summary.topWastedIngredients.map((row) => (
                <div key={row.ingredientId} className="flex justify-between text-sm border-b pb-2 last:border-0">
                  <span>{row.name}</span>
                  <span>{row.totalConsumed} {row.usageUnit} · £{row.totalCost.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Waste by Reason</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {wasteData.summary.wasteByReason.length === 0 && (
                <p className="text-sm text-muted-foreground">No waste recorded yet.</p>
              )}
              {wasteData.summary.wasteByReason.map((row) => (
                <div key={row.reason} className="flex justify-between text-sm border-b pb-2 last:border-0">
                  <span>{row.reason}</span>
                  <span>£{row.cost.toFixed(2)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Waste Log</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Ingredient</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              )}
              {!loading && wasteData?.movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No waste logged yet.</TableCell>
                </TableRow>
              )}
              {wasteData?.movements.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="text-xs">{new Date(m.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{m.ingredient?.name}</TableCell>
                  <TableCell>{Math.abs(m.normalizedQuantity)} {m.ingredient?.usageUnit}</TableCell>
                  <TableCell>£{Math.abs(m.totalCost).toFixed(2)}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Waste</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="ingredientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingredient</FormLabel>
                    <FormControl>
                      <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                        <option value="">Select...</option>
                        {ingredients.map((ing) => (
                          <option key={ing._id} value={ing._id}>{ing.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                        <option value="">Select...</option>
                        {locations.map((l) => (
                          <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
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
              </div>
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <select className="w-full border rounded-md h-9 px-2 text-sm bg-background" {...field}>
                        <option value="">Select a reason...</option>
                        {(wasteData?.reasons || []).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text="Record Waste" />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
