"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RiMenu4Fill } from "react-icons/ri";
import { BarChart3, ChefHat, ShoppingCart, Wallet } from "lucide-react";
import Themeswitch from "./Themeswitch";
import UserDropDown from "./UserDropDown";
import { Button } from "@/components/ui/button";
import AdminSearch from "./AdminSearch";
import { useSidebar } from "@/components/ui/sidebar";
import AdminMobileSearch from "./AdminMobileSearch";

// AmarSolution-style quick links (top right of every admin page)
export const QUICK_LINKS = [
  { label: "Purchases", href: "/admin/inventory/purchase-orders", icon: Wallet, cls: "bg-[#1E9E50] hover:bg-[#178643]" },
  { label: "Kitchen", href: "/admin/kitchen", icon: ChefHat, cls: "bg-[#7B2CBF] hover:bg-[#6A1FB0]" },
  { label: "Today's Summary", summary: true, icon: BarChart3, cls: "bg-[#2D7DD2] hover:bg-[#2369B5]" },
  { label: "New Order", href: "/admin/pos", icon: ShoppingCart, cls: "bg-[#2F6B16] hover:bg-[#245511]" },
];

export function useOpenSummary() {
  const router = useRouter();
  const pathname = usePathname();
  return () => {
    if (pathname === "/admin/dashboard") window.dispatchEvent(new Event("sfg:summary"));
    else router.push("/admin/dashboard?summary=1");
  };
}

const Topbar = () => {
  const { toggleSidebar } = useSidebar();
  const openSummary = useOpenSummary();

  return (
    <div className="fixed left-0 top-0 z-30 flex h-14 w-full items-center justify-between border-b bg-white px-5 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:bg-background md:pe-8 md:ps-72">
      <div className="flex items-center md:hidden">
        <h1 className="text-lg font-bold">
          Shawon <span className="text-[#E1262D]">Food Gate</span>
        </h1>
      </div>

      <div className="hidden md:block">
        <AdminSearch />
      </div>

      <div className="flex items-center gap-2">
        <div className="mr-2 hidden items-center gap-1.5 xl:flex">
          <span className="mr-1 text-sm font-semibold text-muted-foreground">Quick Links:</span>
          {QUICK_LINKS.map(({ label, href, summary, icon: Icon, cls }) =>
            href ? (
              <Link key={label} href={href} className={`flex h-8 items-center gap-1.5 rounded px-3 text-[13px] font-semibold text-white transition ${cls}`}>
                <Icon size={15} /> {label}
              </Link>
            ) : (
              <button key={label} type="button" onClick={summary ? openSummary : undefined} className={`flex h-8 items-center gap-1.5 rounded px-3 text-[13px] font-semibold text-white transition ${cls}`}>
                <Icon size={15} /> {label}
              </button>
            ),
          )}
        </div>

        <AdminMobileSearch />
        <Themeswitch />
        <UserDropDown />
        <Button type="button" size="icon" className="ms-2 md:hidden" onClick={toggleSidebar}>
          <RiMenu4Fill />
        </Button>
      </div>
    </div>
  );
};

export default Topbar;
