"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Star } from "lucide-react";

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
  { href: "#", label: "Locations" },
];

const LOCATION_TYPES = ["KITCHEN", "STORAGE", "FREEZER", "FRIDGE", "SHOWROOM", "OTHER"];

const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  type: z.enum(LOCATION_TYPES),
  address: z.string().trim().optional().default(""),
});

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", code: "", type: "OTHER", address: "" },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/inventory/locations");
      if (data.success) setLocations(data.data);
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
      const { data } = await axios.post("/api/admin/inventory/locations", values);
      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      form.reset();
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id) => {
    try {
      const { data } = await axios.patch(`/api/admin/inventory/locations/${id}`, {
        isDefault: true,
      });
      if (!data.success) throw new Error(data.message);
      showToast("success", "Default location updated.");
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    }
  };

  const toggleActive = async (location) => {
    try {
      const { data } = await axios.patch(`/api/admin/inventory/locations/${location._id}`, {
        active: !location.active,
      });
      if (!data.success) throw new Error(data.message);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Locations</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Location
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Website and POS orders consume ingredient stock from whichever location is marked{" "}
        <b>Default</b>. Set one before recipes go live.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
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
              {!loading && locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No locations yet.
                  </TableCell>
                </TableRow>
              )}
              {locations.map((location) => (
                <TableRow key={location._id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {location.name}
                    {location.isDefault && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3" /> Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{location.code}</TableCell>
                  <TableCell>{location.type}</TableCell>
                  <TableCell>
                    <Badge variant={location.active ? "default" : "outline"}>
                      {location.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {!location.isDefault && (
                      <Button size="sm" variant="outline" onClick={() => setDefault(location._id)}>
                        Make Default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(location)}>
                      {location.active ? "Deactivate" : "Activate"}
                    </Button>
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
            <DialogTitle>Add Stock Location</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Kitchen" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="KITCHEN-1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <select
                        className="w-full border rounded-md h-9 px-3 text-sm bg-background"
                        {...field}
                      >
                        {LOCATION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text="Save Location" />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
