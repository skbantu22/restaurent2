"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { Home, MessageCircle, User } from "lucide-react";
import Cart from "@/components/ui/Application/website/cart";
import { Avatar, AvatarImage } from "../../avatar";
import userIcon from "@/public/assets/user.png";
import SearchBox from "../Admin/SearchBox";
import { USER_DASHBOARD, WEBSITE_LOGIN } from "@/Route/Websiteroute";

export default function MobileBottomNav() {
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const auth = useSelector((store) => store.authStore.auth);

  const handleSearchSubmit = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/shop?${params.toString()}`);
    setShowMobileSearch(false);
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowMobileSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (href) =>
    pathname === href || pathname.startsWith(href + "/");
  const navItem =
    "flex flex-col items-center justify-center text-[11px] gap-[2px] transition";

  return (
    <>
      {/* Mobile Search Dropdown */}
      {showMobileSearch && (
        <div
          ref={searchRef}
          className="fixed inset-x-4 top-0 z-50 mt-14 bg-white p-2 shadow-md rounded-md"
        >
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={handleSearchSubmit}
            placeholder="Search entire store..."
          />
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="relative bg-white border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)] rounded-t-2xl h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)]">
          {/* Floating Cart Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <div className="h-16 w-16 rounded-full bg-white shadow-lg border flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center text-white">
                <Cart active />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 h-full">
            {/* Home */}
            <Link
              href="/"
              className="flex flex-col items-center justify-center text-xs"
            >
              <Home
                size={22}
                className={
                  isActive("/") ? "text-red-500 fill-red-500" : "text-gray-600"
                }
              />
              <span
                className={
                  isActive("/") ? "text-red-500 font-semibold" : "text-gray-600"
                }
              >
                Home
              </span>
            </Link>

            {/* Offers */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="flex flex-col items-center justify-center text-xs text-gray-600"
            >
              <MessageCircle size={22} />
              <span>Offers</span>
            </button>

            {/* Orders */}
            <Link
              href="/orders"
              className="flex flex-col items-center justify-center text-xs text-gray-600"
            >
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M9 7h6M9 11h6M9 15h4" />
              </svg>

              <span>Orders</span>
            </Link>

            {/* Account */}
            {!auth ? (
              <Link
                href={WEBSITE_LOGIN}
                className="flex flex-col items-center justify-center text-xs text-gray-600"
              >
                <User size={22} />
                <span>Account</span>
              </Link>
            ) : (
              <Link
                href={USER_DASHBOARD}
                className="flex flex-col items-center justify-center text-xs text-gray-600"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage
                    src={
                      auth?.avatar?.url ||
                      auth?.data?.user?.avatar?.url ||
                      auth?.user?.avatar?.url ||
                      userIcon.src
                    }
                  />
                </Avatar>
                <span>Account</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
