"use client";
import { UserRound } from "lucide-react";
import FloorListPage from "@/components/ui/Application/Admin/FloorListPage";

export default function WaitersPage() {
  return <FloorListPage field="waiters" title="Waiters" singular="Waiter" icon={UserRound} placeholder="e.g. Rahim"
    hint="Waiter names shown in the POS “Select waiter” list. Staff logins also appear there automatically." />;
}
