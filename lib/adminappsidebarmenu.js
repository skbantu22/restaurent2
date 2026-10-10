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
  IoSettingsOutline,
  IoBusOutline,
  IoBagHandleOutline,
  IoLayersOutline,
  IoBarChartOutline,
  IoIdCardOutline,
  IoReceiptOutline,
  IoWalletOutline,
  IoPersonCircleOutline,
  IoChatbubbleEllipsesOutline,
  IoCubeOutline,
} from "react-icons/io5";

// AmarSolution-style admin menu (Dashboard, Food Manage, Supplier,
// Customer, Order, Purchase, Stock, Report, Employee, Setting). Every item
// leads to a real page.
export const sidebarMenu = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: IoGridOutline,
  },
  {
    title: "Food Manage",
    url: "#",
    icon: IoRestaurantOutline,
    submenu: [
      { title: "Add Food", url: ADMIN_PRODUCT_ADD },
      { title: "Food List", url: ADMIN_PRODUCT_SHOW },
      { title: "Food Category", url: ADMIN_CATEGORY_SHOW },
      { title: "Add Category", url: ADMIN_CATEGORY_ADD },
      { title: "Table", url: "/admin/tables" },
      { title: "Waiter", url: "/admin/waiters" },
      { title: "Recipes", url: "/admin/inventory/recipes" },
    ],
  },
  {
    title: "Supplier",
    url: "/admin/inventory/suppliers",
    icon: IoBusOutline,
  },
  {
    title: "Customer",
    url: "#",
    icon: IoPeopleOutline,
    submenu: [
      { title: "All Customers", url: "/admin/customers" },
      { title: "Coupons / Offers", url: "/admin/coupon" },
    ],
  },
  {
    title: "Order",
    url: "#",
    icon: IoCartOutline,
    submenu: [
      { title: "POS (New Order)", url: "/admin/pos" },
      { title: "Kitchen Display", url: "/admin/kitchen" },
      { title: "All Orders", url: "/admin/all-orders" },
    ],
  },
  {
    title: "Products",
    url: "#",
    icon: IoCubeOutline,
    submenu: [
      { title: "Product List", url: "/admin/inventory/ingredients" },
      { title: "Recipe Costing", url: "/admin/inventory/reports" },
    ],
  },
  {
    title: "Purchase",
    url: "/admin/inventory/purchase-orders",
    icon: IoBagHandleOutline,
  },
  {
    title: "Stock",
    url: "#",
    icon: IoLayersOutline,
    submenu: [
      { title: "Stock Overview", url: "/admin/inventory" },
      { title: "Ingredients", url: "/admin/inventory/ingredients" },
      { title: "Stock Counts", url: "/admin/inventory/stock-counts" },
      { title: "Waste", url: "/admin/inventory/waste" },
      { title: "Locations", url: "/admin/inventory/locations" },
    ],
  },
  {
    title: "Report",
    url: "/admin/reports",
    icon: IoBarChartOutline,
  },
  {
    title: "Expense",
    url: "/admin/expenses",
    icon: IoReceiptOutline,
  },
  {
    title: "Account",
    url: "/admin/accounts",
    icon: IoWalletOutline,
  },
  {
    title: "Employee",
    url: "#",
    icon: IoIdCardOutline,
    submenu: [
      { title: "Salary", url: "/admin/inventory/salaries" },
      { title: "Waiters", url: "/admin/waiters" },
    ],
  },
  {
    title: "User",
    url: "/admin/users",
    icon: IoPersonCircleOutline,
  },
  {
    title: "Message",
    url: "/admin/messages",
    icon: IoChatbubbleEllipsesOutline,
  },
  {
    title: "Setting",
    url: "#",
    icon: IoSettingsOutline,
    submenu: [
      { title: "Restaurant Settings", url: "/admin/settings" },
      { title: "Media Library", url: "/admin/media" },
    ],
  },
];
