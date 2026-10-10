"use client";
import { UtensilsCrossed } from "lucide-react";
import FloorListPage from "@/components/ui/Application/Admin/FloorListPage";

export default function TablesPage() {
  return <FloorListPage field="tables" title="Tables" singular="Table" icon={UtensilsCrossed} placeholder="e.g. T13 or Window 2"
    hint="Dine-in tables shown in the POS “Select table” list and on the dashboard floor plan." />;
}
