"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Re-keyed on the pathname so every admin page navigation gets a fresh
// fade/slide-in instead of only animating once on first mount.
export default function AdminPageTransition({ children }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
