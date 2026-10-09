import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";
import Footer from "@/components/ui/Application/website/Footer";
import Header from "@/components/ui/Application/website/Header";
import MobileBottomNav from "@/components/ui/Application/website/MobileBottomNav";

import { Outfit, Playfair_Display, Lobster, Poppins, DM_Serif_Display } from "next/font/google";
import React from "react";
import { ToastContainer } from "react-toastify";

// Import MetaPixel
import MetaPixel from "@/lib/MetaPixel";
import GoogleAdsTag from "@/lib/GoogleAdsTag";
import { connectDB } from "@/lib/databaseconnection";
import FBTrackingSetting from "@/models/FbTrackingSetting.model";
import LiveOrderWidget from "@/components/ui/Application/website/LiveOrderWidget";

// Reads the database on every request (settings, tracking), so never
// pre-render at build time — Vercel builds without DB access otherwise fail.
export const dynamic = "force-dynamic";

const outfit = Outfit({
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-jost",
});

const playfair = Playfair_Display({
  weight: ["700", "800", "900"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-display",
});

// Demo 2 (light design) fonts
const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-d2-body",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  display: "swap",
  subsets: ["latin"],
  variable: "--font-d2-display",
});

const lobster = Lobster({
  weight: "400",
  display: "swap",
  subsets: ["latin"],
  variable: "--font-script",
});

const Layout = async ({ children }) => {
  await connectDB();

  let settings = await FBTrackingSetting.findOne().lean();

  if (!settings) {
    const newSettings = await FBTrackingSetting.create({
      meta: {
        enabled: true,
        pixelId: "",
        accessToken: "",
        testEventCode: "",
      },
    });

    settings = JSON.parse(JSON.stringify(newSettings));
  }

  // Only ever pass the safe, non-secret subset to client components —
  // Server→Client props are serialized into the page payload, so the
  // full document (which includes the Meta Graph API access token)
  // must never be passed down as-is.
  const trackingSettings = {
    meta: {
      enabled: settings.meta?.enabled || false,
      pixelId: settings.meta?.pixelId || "",
    },
    googleAds: {
      enabled: settings.googleAds?.enabled || false,
      conversionId: settings.googleAds?.conversionId || "",
      conversionLabel: settings.googleAds?.conversionLabel || "",
    },
  };

  return (
    <GlobalStoreProvider>
      <div className={`${outfit.className} ${outfit.variable} ${playfair.variable} ${lobster.variable} ${poppins.variable} ${dmSerif.variable} sfg-site`}>
        <MetaPixel settings={trackingSettings} />
        <GoogleAdsTag settings={trackingSettings} />

        <Header />

        <main>{children}</main>

        {/* Live Order Floating Widget */}
        <LiveOrderWidget />

        <ToastContainer position="top-right" autoClose={3000} newestOnTop />

        <Footer />

        <MobileBottomNav />
      </div>
    </GlobalStoreProvider>
  );
};

export default Layout;
