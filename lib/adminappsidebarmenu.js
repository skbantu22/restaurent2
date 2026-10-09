import {
  ADMIN_CATEGORY_ADD,
  ADMIN_CATEGORY_SHOW,
  ADMIN_PRODUCT_ADD,
  ADMIN_PRODUCT_SHOW,
} from "@/Route/Adminpannelroute";

import {
  IoGridOutline,
  IoCartOutline,
  IoPeopleOutline,
  IoRestaurantOutline,
  IoCubeOutline,
  IoSettingsOutline,
} from "react-icons/io5";

import { BiCategory } from "react-icons/bi";

// Note: only nav items that lead to a real page are listed here. Several
// sections from an earlier template (Payments, Shipping, Marketing,
// Content, Messages, a duplicate Reports, Showroom, and the Orders >
// Invoices link) pointed at pages that were never built and have been
// removed rather than left as dead 404 links. Settings was in that list
// too, but now has a real page (/admin/settings) and is back. The
// underlying admin pages/data for anything not listed here (e.g.
// Coupons, Banner, Media, Product Variants) still exist on disk and are
// reachable by direct URL — this only trims the sidebar, nothing was
// deleted.
export const sidebarMenu = [
  // ============================================
  // DASHBOARD
  // ============================================
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IoGridOutline,
  },

  // ============================================
  // CATALOG
  // ============================================
  {
    title: "Category",
    url: "#",
    icon: BiCategory,
    submenu: [
      {
        title: "Add Category",
        url: ADMIN_CATEGORY_ADD,
      },
      {
        title: "All Category",
        url: ADMIN_CATEGORY_SHOW,
      },
    ],
  },

  // ============================================
  // PRODUCTS
  // ============================================
  {
    title: "Products",
    url: "#",
    icon: IoRestaurantOutline,
    submenu: [
      {
        title: "Add Product",
        url: ADMIN_PRODUCT_ADD,
      },
      {
        title: "All Products",
        url: ADMIN_PRODUCT_SHOW,
      },
      {
        title: "Barcode Print",
        url: "/admin/barcode",
      },
    ],
  },

  // ============================================
  // ORDERS
  // ============================================
  {
    title: "Orders",
    url: "/admin/all-orders",
    icon: IoCartOutline,
    submenu: [
      {
        title: "POS",
        url: "/admin/pos",
      },
      {
        title: "All Orders",
        url: "/admin/all-orders",
      },
    ],
  },

  // ============================================
  // CUSTOMERS
  // ============================================
  {
    title: "Customers",
    url: "/admin/customers",
    icon: IoPeopleOutline,
  },

  // ============================================
  // RESTAURANT INVENTORY
  // ============================================
  {
    title: "Inventory",
    url: "/admin/inventory",
    icon: IoCubeOutline,
    submenu: [
      { title: "Dashboard", url: "/admin/inventory" },
      { title: "Ingredients", url: "/admin/inventory/ingredients" },
      { title: "Recipes", url: "/admin/inventory/recipes" },
      { title: "Suppliers", url: "/admin/inventory/suppliers" },
      { title: "Locations", url: "/admin/inventory/locations" },
      { title: "Purchase Orders", url: "/admin/inventory/purchase-orders" },
      { title: "Stock Counts", url: "/admin/inventory/stock-counts" },
      { title: "Waste", url: "/admin/inventory/waste" },
      { title: "Staff Salary", url: "/admin/inventory/salaries" },
      { title: "Recipe Costing Report", url: "/admin/inventory/reports" },
    ],
  },

  // ============================================
  // SETTINGS
  // ============================================
  {
    title: "Settings",
    url: "/admin/settings",
    icon: IoSettingsOutline,
  },
];
