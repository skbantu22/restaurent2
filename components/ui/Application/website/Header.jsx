"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Demo2Navbar from "./demo2/Demo2Navbar";

// Demo 2 (light, flyer-style design) gets its own header so the client
// can compare both looks; every other page uses the main Navbar.
const Header = () => {
  const pathname = usePathname();
  return pathname?.startsWith("/demo-2") ? <Demo2Navbar /> : <Navbar />;
};

export default Header;
