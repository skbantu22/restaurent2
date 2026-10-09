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
  { href: "#", label: "Suppliers" },
];

const formSchema = z.object({
  supplierCode: z.string().trim().min(1, "Code is required"),
  companyName: z.string().trim().min(1, "Company name is required"),
  contactName: z.string().trim().optional().default(""),
  phone: z.string().trim().optional().default(""),
  email: z.string().trim().email().optional().or(z.literal("")).default(""),
  address: z.string().trim().optional().default(""),
  paymentTerms: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierCode: "",
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      paymentTerms: "",
      notes: "",
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/inventory/suppliers");
      if (data.success) setSuppliers(data.data);
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
      supplierCode: "",
      companyName: "",
      contactName: "",
      phone: "",
      email: "",
      address: "",
      paymentTerms: "",
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = (supplier) => {
    setEditing(supplier);
    form.reset({
      supplierCode: supplier.supplierCode,
      companyName: supplier.companyName,
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      paymentTerms: supplier.paymentTerms || "",
      notes: supplier.notes || "",
    });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = editing
        ? await axios.patch(`/api/admin/inventory/suppliers/${editing._id}`, values)
        : await axios.post("/api/admin/inventory/suppliers", values);

      if (!data.success) throw new Error(data.message);
      showToast("success", data.message);
      setOpen(false);
      load();
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (supplier) => {
    try {
      const { data } = await axios.patch(`/api/admin/inventory/suppliers/${supplier._id}`, {
        active: !supplier.active,
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
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No suppliers yet.
                  </TableCell>
                </TableRow>
              )}
              {suppliers.map((supplier) => (
                <TableRow key={supplier._id}>
                  <TableCell className="font-medium">{supplier.companyName}</TableCell>
                  <TableCell>{supplier.supplierCode}</TableCell>
                  <TableCell>{supplier.contactName || "-"}</TableCell>
                  <TableCell>{supplier.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.active ? "default" : "outline"}>
                      {supplier.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(supplier)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(supplier)}>
                      {supplier.active ? "Deactivate" : "Activate"}
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
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Code</FormLabel>
                      <FormControl>
                        <Input placeholder="SUP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
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
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input placeholder="Net 30" {...field} />
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <ButtonLoading type="submit" loading={saving} text={editing ? "Save Changes" : "Add Supplier"} />
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
