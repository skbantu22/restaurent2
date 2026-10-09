"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "#", label: "Staff Salary" },
];

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = (month) => ({
  staff: "",
  staffName: "",
  position: "",
  month,
  baseSalary: "",
  bonus: "",
  deductions: "",
  paymentStatus: "pending",
  paymentMethod: "bank",
  paidDate: "",
  note: "",
});

const money = (n) =>
  `£${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

function Summary({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm dark:bg-card">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

const selectClass =
  "h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export default function StaffSalaryPage() {
  const [month, setMonth] = useState(thisMonth());
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0, staffCount: 0 });
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(thisMonth()));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/admin/inventory/salaries?month=${month}`);
      if (!data?.success) throw new Error(data?.message);
      setEntries(data.data.entries);
      setTotals(data.data.totals);
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Failed to load salaries.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    axios
      .get("/api/admin/inventory/salaries/staff")
      .then(({ data }) => data?.success && setStaffList(data.data))
      .catch(() => {});
  }, []);

  const net = useMemo(
    () => Number(form.baseSalary || 0) + Number(form.bonus || 0) - Number(form.deductions || 0),
    [form.baseSalary, form.bonus, form.deductions],
  );

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(month));
    setOpen(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setForm({
      staff: entry.staff || "",
      staffName: entry.staffName,
      position: entry.position || "",
      month: entry.month,
      baseSalary: String(entry.baseSalary),
      bonus: String(entry.bonus || ""),
      deductions: String(entry.deductions || ""),
      paymentStatus: entry.paymentStatus,
      paymentMethod: entry.paymentMethod,
      paidDate: entry.paidDate ? entry.paidDate.slice(0, 10) : "",
      note: entry.note || "",
    });
    setOpen(true);
  };

  // picking a staff account fills the name; typing a name clears the link
  const onPickStaff = (e) => {
    const id = e.target.value;
    const user = staffList.find((s) => s._id === id);
    setForm((f) => ({
      ...f,
      staff: id,
      staffName: user ? user.name : f.staffName,
      position: user && !f.position ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : f.position,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.staffName.trim()) return showToast("error", "Staff name is required.");
    if (form.baseSalary === "" || Number(form.baseSalary) < 0) {
      return showToast("error", "Enter the base salary.");
    }
    if (net < 0) return showToast("error", "Deductions can't be more than salary + bonus.");

    setSaving(true);
    try {
      const payload = {
        ...form,
        bonus: form.bonus || 0,
        deductions: form.deductions || 0,
        paidDate: form.paymentStatus === "paid" ? form.paidDate || today() : "",
      };
      const { data } = editing
        ? await axios.patch(`/api/admin/inventory/salaries/${editing._id}`, payload)
        : await axios.post("/api/admin/inventory/salaries", payload);
      if (!data?.success) throw new Error(data?.message);

      showToast("success", editing ? "Salary entry updated." : "Salary entry added.");
      setOpen(false);
      if (form.month !== month) setMonth(form.month);
      else load();
    } catch (error) {
      showToast("error", error?.response?.data?.message || error?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (entry) => {
    try {
      const { data } = await axios.patch(`/api/admin/inventory/salaries/${entry._id}`, {
        paymentStatus: "paid",
        paidDate: today(),
      });
      if (!data?.success) throw new Error(data?.message);
      showToast("success", `${entry.staffName} marked as paid.`);
      load();
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Failed to update.");
    }
  };

  const remove = async (entry) => {
    if (!window.confirm(`Delete the ${monthLabel(entry.month)} salary entry for ${entry.staffName}?`)) return;
    try {
      const { data } = await axios.delete(`/api/admin/inventory/salaries/${entry._id}`);
      if (!data?.success) throw new Error(data?.message);
      showToast("success", "Salary entry deleted.");
      load();
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-4 pb-10">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Staff Salary</h1>
          <p className="text-sm text-muted-foreground">
            Record monthly pay for each staff member and track what&apos;s been paid.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="w-44"
          />
          <Button onClick={openAdd} className="bg-orange-500 text-white hover:bg-orange-600">
            <Plus className="h-4 w-4" /> Add Salary
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label={`Total payroll · ${monthLabel(month)}`} value={money(totals.total)} icon={Wallet} accent="bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" />
        <Summary label="Paid" value={money(totals.paid)} icon={CheckCircle2} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
        <Summary label="Pending" value={money(totals.pending)} icon={Clock} accent="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
        <Summary label="Staff paid this month" value={totals.staffCount} icon={Users} accent="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No salary entries for {monthLabel(month)} yet.{" "}
                    <button onClick={openAdd} className="font-semibold text-orange-600 hover:underline">
                      Add the first one
                    </button>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      <p className="font-medium">{entry.staffName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.position || "—"}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">{money(entry.baseSalary)}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {entry.bonus ? `+${money(entry.bonus)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {entry.deductions ? `−${money(entry.deductions)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold">{money(entry.netPay)}</TableCell>
                    <TableCell>
                      {entry.paymentStatus === "paid" ? (
                        <span className="inline-flex flex-col">
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                          <span className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                            {entry.paymentMethod}
                            {entry.paidDate ? ` · ${new Date(entry.paidDate).toLocaleDateString("en-GB")}` : ""}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      {entry.paymentStatus !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(entry)}>
                          Mark paid
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(entry)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(entry)} aria-label="Delete" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editing ? "Edit Salary Entry" : "Add Salary Entry"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {staffList.length > 0 && (
              <Field label="Staff account (optional)">
                <select value={form.staff} onChange={onPickStaff} className={selectClass}>
                  <option value="">— Not linked / type a name below —</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Staff name">
                <Input
                  value={form.staffName}
                  onChange={(e) => setForm((f) => ({ ...f, staffName: e.target.value, staff: "" }))}
                  placeholder="e.g. Rahim Uddin"
                />
              </Field>
              <Field label="Position">
                <Input value={form.position} onChange={set("position")} placeholder="e.g. Chef, Cashier" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Month">
                <Input type="month" value={form.month} onChange={set("month")} />
              </Field>
              <Field label="Base salary (£)">
                <Input type="number" min="0" step="0.01" value={form.baseSalary} onChange={set("baseSalary")} placeholder="0.00" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Bonus / overtime (£)">
                <Input type="number" min="0" step="0.01" value={form.bonus} onChange={set("bonus")} placeholder="0.00" />
              </Field>
              <Field label="Deductions (£)">
                <Input type="number" min="0" step="0.01" value={form.deductions} onChange={set("deductions")} placeholder="0.00" />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3 dark:bg-orange-500/10">
              <span className="text-sm font-medium">Net pay</span>
              <span className={`text-lg font-bold ${net < 0 ? "text-red-600" : "text-orange-600"}`}>{money(net)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Status">
                <select value={form.paymentStatus} onChange={set("paymentStatus")} className={selectClass}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </Field>
              <Field label="Payment method">
                <select value={form.paymentMethod} onChange={set("paymentMethod")} className={selectClass}>
                  <option value="bank">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            {form.paymentStatus === "paid" && (
              <Field label="Paid on">
                <Input type="date" value={form.paidDate || today()} onChange={set("paidDate")} />
              </Field>
            )}

            <Field label="Note (optional)">
              <Input value={form.note} onChange={set("note")} placeholder="e.g. 10 hours overtime" />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                {saving ? "Saving..." : editing ? "Save changes" : "Add salary"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
