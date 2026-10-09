"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LuChevronRight } from "react-icons/lu";
import { IoMdClose } from "react-icons/io";

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

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

import { sidebarMenu } from "@/lib/adminappsidebarmenu";
import { Button } from "../../button";

export default function Appsidebar() {
  const { toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();

  // ✅ Close only on mobile after navigation
  const handleNav = () => {
    if (isMobile) toggleSidebar();
  };

  return (
    <Sidebar className="z-50">
      <SidebarHeader className="border-b h-14 p-0">
        <div className="flex justify-between items-center px-4">
          <h1 className="text-xl font-bold tracking-wide text-primary">
            Shawon Food Gate
          </h1>

          <Button
            onClick={toggleSidebar}
            type="button"
            size="icon"
            className="md:hidden"
          >
            <IoMdClose />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarMenu.map((menu, index) => {
              const hasSubmenu =
                Array.isArray(menu?.submenu) && menu.submenu.length > 0;

              const isValidHref =
                typeof menu?.url === "string" &&
                menu.url.startsWith("/") &&
                menu.url.length > 1;

              const href = isValidHref ? menu.url : "/admin";
              const isActive = pathname === href;
              const hasActiveChild =
                hasSubmenu &&
                menu.submenu.some((sub) => sub?.url && pathname === sub.url);

              return (
                <Collapsible
                  key={index}
                  className="group/collapsible"
                  defaultOpen={hasActiveChild}
                >
                  <SidebarMenuItem>
                    {hasSubmenu ? (
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          type="button"
                          isActive={hasActiveChild}
                          className="flex items-center gap-2"
                        >
                          <motion.span
                            whileHover={{ scale: 1.15 }}
                            className="flex items-center"
                          >
                            <menu.icon />
                          </motion.span>
                          <span>{menu.title}</span>
                          <LuChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="flex items-center gap-2"
                      >
                        <Link href={href} onClick={handleNav}>
                          <motion.span
                            whileHover={{ scale: 1.15 }}
                            className="flex items-center"
                          >
                            <menu.icon />
                          </motion.span>
                          <span>{menu.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}

                    {hasSubmenu && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {menu.submenu.map((sub, subIndex) => {
                            const subValid =
                              typeof sub?.url === "string" &&
                              sub.url.startsWith("/") &&
                              sub.url.length > 1;

                            const subHref = subValid ? sub.url : "/admin";

                            return (
                              <SidebarMenuSubItem key={subIndex}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === subHref}
                                >
                                  <Link href={subHref} onClick={handleNav}>
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

      <SidebarFooter />
    </Sidebar>
  );
}
