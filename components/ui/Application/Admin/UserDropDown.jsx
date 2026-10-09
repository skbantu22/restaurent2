"use client"
import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Barcode,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  Settings,
  UserRound,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { logout } from '@/store/reducer/authReducer'
import { showToast } from '@/lib/showToast'
import { WEBSITE_LOGIN } from '@/Route/Websiteroute'
import {
  ADMIN_DASHBOARD,
  ADMIN_ORDER_SHOW,
  ADMIN_PRODUCT_ADD,
} from '@/Route/Adminpannelroute'

const DEFAULT_AVATAR = "/assets/avatar-default.svg"

const MENU_ITEMS = [
  { href: "/admin/settings?tab=profile", label: "My Profile", hint: "Photo, name & password", icon: UserRound },
  { href: ADMIN_DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { href: ADMIN_PRODUCT_ADD, label: "Add Product", icon: PackagePlus },
  { href: ADMIN_ORDER_SHOW, label: "Orders", icon: ClipboardList },
  { href: "/admin/barcode", label: "Print Barcodes", icon: Barcode },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18 } },
}

const itemClass =
  "group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-orange-50 data-[highlighted]:text-orange-700 dark:data-[highlighted]:bg-orange-500/10 dark:data-[highlighted]:text-orange-400"

const iconWrapClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 transition-colors group-data-[highlighted]:bg-orange-100 group-data-[highlighted]:text-orange-600 dark:bg-zinc-800 dark:text-zinc-300 dark:group-data-[highlighted]:bg-orange-500/15 dark:group-data-[highlighted]:text-orange-400"

const UserDropDown = () => {
  // Extract user data from Redux
  const user = useSelector((store) => store.authStore.auth?.user || store.authStore.auth?.data?.user);
  const dispatch = useDispatch()
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)

  // Helper to get Initials (e.g., "John Doe" -> "JD")
  const getInitials = (name) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      const { data } = await axios.post('/api/auth/logout')
      if (!data.success) throw new Error(data.message)
      dispatch(logout())
      showToast('success', data.message)
      router.push(WEBSITE_LOGIN)
    } catch (error) {
      showToast('error', error.message)
    }
  }

  if (!user) return null; // Or a Login button

  // Profile photo if set, otherwise the default (dummy) profile picture
  const avatarSrc =
    user?.avatar?.url ||
    (typeof user?.avatar === "string" ? user.avatar : "") ||
    user?.image ||
    DEFAULT_AVATAR

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-orange-500/40 focus-visible:ring-2 focus-visible:ring-orange-500"
          aria-label="Account menu"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={avatarSrc} alt={user?.name || "User"} className="object-cover" />
            <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
          </Avatar>
          {/* Online Status Badge */}
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <AnimatePresence>
        {open && (
          <DropdownMenuPrimitive.Portal forceMount>
            <DropdownMenuPrimitive.Content
              forceMount
              asChild
              align="end"
              sideOffset={10}
              className="z-50 outline-none"
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
                style={{ transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)" }}
                className="w-72 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xl"
              >
                {/* Profile header — click to open My Profile */}
                <DropdownMenuPrimitive.Item asChild>
                  <Link
                    href="/admin/settings?tab=profile"
                    className="group block outline-none"
                  >
                    <div className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-zinc-900 px-4 pb-4 pt-4 text-white">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-white/80 shadow">
                          <AvatarImage src={avatarSrc} alt={user?.name || "User"} className="object-cover" />
                          <AvatarFallback className="text-zinc-900">{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold capitalize">{user?.name}</p>
                          <p className="truncate text-xs text-white/80">{user?.email}</p>
                          {user?.role && (
                            <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-px text-[10px] font-semibold uppercase tracking-wide">
                              {user.role}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/70 transition-transform group-hover:translate-x-0.5 group-data-[highlighted]:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                </DropdownMenuPrimitive.Item>

                <motion.div
                  className="p-1.5"
                  variants={listVariants}
                  initial={reduceMotion ? false : "hidden"}
                  animate="visible"
                >
                  {MENU_ITEMS.map(({ href, label, hint, icon: Icon }) => (
                    <motion.div key={href} variants={itemVariants}>
                      <DropdownMenuPrimitive.Item asChild>
                        <Link href={href} className={itemClass}>
                          <span className={iconWrapClass}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium leading-tight">{label}</span>
                            {hint && (
                              <span className="text-[11px] leading-tight text-muted-foreground">{hint}</span>
                            )}
                          </span>
                        </Link>
                      </DropdownMenuPrimitive.Item>
                    </motion.div>
                  ))}

                  <DropdownMenuPrimitive.Separator className="my-1.5 h-px bg-border" />

                  <motion.div variants={itemVariants}>
                    <DropdownMenuPrimitive.Item
                      onSelect={handleLogout}
                      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 outline-none transition-colors data-[highlighted]:bg-red-50 dark:text-red-400 dark:data-[highlighted]:bg-red-500/10"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                        <LogOut className="h-4 w-4" />
                      </span>
                      Logout
                    </DropdownMenuPrimitive.Item>
                  </motion.div>
                </motion.div>
              </motion.div>
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        )}
      </AnimatePresence>
    </DropdownMenuPrimitive.Root>
  )
}

export default UserDropDown
