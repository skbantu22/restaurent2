import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import GlobalStoreProvider from "@/components/ui/Application/GlobalStoreProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Shawon Food Gate | Halal Restaurant, Forest Gate London",
  description: "Biryani, döner kebab, curry, English breakfast, fresh naan, coffee & karak tea. 100% halal. 179 Forest Ln, London E7 9BB."
};

// viewportFit: "cover" is required for env(safe-area-inset-*) to
// return real values on iPhone Safari (it's 0 otherwise) — needed by
// the "Select Items" modal's safe-area padding, see globals.css.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalStoreProvider>{children}</GlobalStoreProvider>

        {/* ✅ Toast Provider */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
