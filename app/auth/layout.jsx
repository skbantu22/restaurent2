import Footer from "@/components/ui/Application/website/Footer";
import Header from "@/components/ui/Application/website/Header";
import React from "react";
import { ToastContainer } from "react-toastify";

const layout = ({ children }) => {
  return (
    <div className="storefront-theme bg-background text-foreground min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <ToastContainer />
      <Footer />
    </div>
  );
};

export default layout;
