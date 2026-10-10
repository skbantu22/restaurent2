import Appsidebar from "@/components/ui/Application/Admin/Appsidebar";
import ThemeProvider from "@/components/ui/Application/Admin/ThemeProvider";
import Topbar from "@/components/ui/Application/Admin/Topbar";
import AdminPageTransition from "@/components/ui/Application/Admin/AdminPageTransition";
import { SidebarProvider } from "@/components/ui/sidebar";
import React from "react";
import { ToastContainer } from "react-toastify";

const layout = ({ children }) => {
  return (
    <div className="admin-theme bg-background text-foreground">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SidebarProvider>
          <Appsidebar />
          <main className="border-2 w-full min-w-0 flex-1">
            <div className=" pt-17.5 md:px-8 sm:px-5 px-3 min-h-[calc(100vh-40px)] pb-10">
              <Topbar />
              <AdminPageTransition>{children}</AdminPageTransition>
            </div>

            <div className="border-t h-[40px] flex justify-center items-center bg-gray-50 dark:bg-background px-3 text-center text-xs sm:text-sm">
              © 2025 Developer SKB ANTU™. All Rights Reserved.
            </div>
          </main>
        </SidebarProvider>
        <ToastContainer />
      </ThemeProvider>
    </div>
  );
};

export default layout;
