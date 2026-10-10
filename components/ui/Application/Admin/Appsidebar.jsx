"use client";

import SfgLogo from "@/components/ui/Application/website/SfgLogo";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";
import { IoGlobeOutline, IoLogOutOutline } from "react-icons/io5";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import { sidebarMenu } from "@/lib/adminappsidebarmenu";
import { logout } from "@/store/reducer/authReducer";
import { Button } from "../../button";

const realUrl = (u) => typeof u === "string" && u.startsWith("/") && u.length > 1;

// The menu link that best matches the current page: exact match, or the
// longest link the page sits under (e.g. /admin/product/edit/1 -> All Foods).
function findActive(pathname) {
  const all = [];
  sidebarMenu.forEach((m, i) => {
    if (m.submenu?.length) m.submenu.forEach((s) => realUrl(s.url) && all.push({ url: s.url, parent: i }));
    else if (realUrl(m.url)) all.push({ url: m.url, parent: i });
  });
  const hits = all.filter((a) => pathname === a.url || pathname.startsWith(`${a.url}/`));
  return hits.sort((a, b) => b.url.length - a.url.length)[0] || null;
}

const ROLE_LABEL = { admin: "Administrator", manager: "Manager", staff: "Kitchen / Staff" };

export default function Appsidebar() {
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname() || "";
  const dispatch = useDispatch();
  const auth = useSelector((s) => s.authStore?.auth);
  const user = auth?.data?.user || auth?.user || auth || {};

  const active = useMemo(() => findActive(pathname), [pathname]);
  const [open, setOpen] = useState(() => (active ? { [active.parent]: true } : {}));

  // Open the group that holds the current page whenever the page changes
  useEffect(() => {
    if (active) setOpen((o) => ({ ...o, [active.parent]: true }));
  }, [active]);

  const handleNav = () => {
    if (isMobile) toggleSidebar();
  };

  const handleLogout = async () => {
    try {
      await axios.post("/api/auth/logout");
    } catch {}
    dispatch(logout());
    window.location.assign("/auth/login");
  };

  return (
    <Sidebar className="z-50">
      <SidebarHeader className="h-14 justify-center border-b p-0">
        <div className="flex items-center justify-between px-4">
          <Link href="/admin/dashboard" onClick={handleNav} aria-label="Dashboard">
            <SfgLogo compact tone="dark" />
          </Link>
          <Button onClick={toggleSidebar} type="button" size="icon" variant="ghost" className="md:hidden" aria-label="Close menu">
            <IoMdClose size={20} />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 py-3">
          <SidebarMenu className="gap-0.5">
            {sidebarMenu.map((menu, index) => {
              const hasSubmenu = Array.isArray(menu?.submenu) && menu.submenu.length > 0;
              const isOpen = !!open[index];
              const groupActive = active?.parent === index;
              const Icon = menu.icon;

              const row = "h-10 gap-3 rounded-md px-3 text-[14.5px] font-medium text-[#343a40] dark:text-zinc-200 [&>svg]:size-[18px]";

              return (
                <Collapsible
                  key={menu.title}
                  open={hasSubmenu ? isOpen : false}
                  onOpenChange={(v) => setOpen((o) => ({ ...o, [index]: v }))}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    {hasSubmenu ? (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton type="button" isActive={groupActive && !isOpen} className={row}>
                          <Icon className={groupActive ? "text-[#15965f]" : "text-[#6c757d]"} />
                          <span className={groupActive ? "text-[#15965f]" : ""}>{menu.title}</span>
                          <LuChevronRight className="ml-auto !size-4 text-[#9aa591] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    ) : (
                      <SidebarMenuButton asChild isActive={groupActive} className={row}>
                        <Link href={menu.url} onClick={handleNav}>
                          <Icon className={groupActive ? "text-[#15965f]" : "text-[#6c757d]"} />
                          <span>{menu.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}

                    {hasSubmenu && (
                      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                        <SidebarMenuSub className="mx-0 ml-[22px] mt-0.5 gap-0.5 border-l border-[#eef1f4] px-0 py-0.5 pl-3">
                          {menu.submenu.map((sub) => {
                            const subActive = active?.url === sub.url;
                            return (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild isActive={subActive} className="h-9 rounded-md px-3 text-[14px] text-[#4a5642] dark:text-zinc-300">
                                  <Link href={realUrl(sub.url) ? sub.url : "/admin/dashboard"} onClick={handleNav}>
                                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${subActive ? "bg-[#1bab70]" : "bg-[#c5cdbf]"}`} />
                                    {sub.title}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg bg-[#e2f6eb] p-2.5 dark:bg-zinc-900">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#1bab70] text-sm font-bold text-white">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user?.name || "Admin"}</span>
            <span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[user?.role] || "Staff"}</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold hover:bg-muted">
            <IoGlobeOutline size={15} /> Website
          </a>
          <button type="button" onClick={handleLogout} className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#ff5b5b] text-xs font-semibold text-white hover:bg-[#f24242]">
            <IoLogOutOutline size={15} /> Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
