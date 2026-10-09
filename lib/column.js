import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Chip } from "@mui/material";

import dayjs from "dayjs"
export const DT_CATEGORY_COLUMN = [
  {
    accessorKey: "name",
    header: "Category Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },
];
export const DT_PRODUCT_COLUMN = [
  {
    accessorKey: "media",
    header: "Image",
    enableColumnFilter: false,
    enableSorting: false,
    Cell: ({ renderedCellValue }) => (
      <Avatar className="rounded-md">
        <AvatarImage src={renderedCellValue?.[0]?.thumbnail || "/assets/img-placeholder.webp"} />
      </Avatar>
    ),
  },
  {
    accessorKey: "name",
    header: "Product Name",
  },
  {
    accessorKey: "slug",
    header: "Slug",
  },

  {
  accessorKey: 'category',
  header: 'Category',
},

{
  accessorKey: 'mrp',
  header: 'MRP',
},
{
  accessorKey: 'sellingPrice',
  header: 'Selling Price',
},
{
  accessorKey: 'discountPercentage',
  header: 'Discount Percentage',
},];
export const DT_PRODUCT_VARIANT_COLUMN= [
 {
  accessorKey: 'product',
  header: 'Product Name',
},
{
  accessorKey: 'color',
  header: 'Color',
},
{
  accessorKey: 'size',
  header: 'Size',
},
{
  accessorKey: "description",
  header: "Description",
},
{
  accessorKey: 'sku',
  header: 'SKU',
},

{
  accessorKey: 'mrp',
  header: 'MRP',
},
{
  accessorKey: 'sellingPrice',
  header: 'Selling Price',
},
{
  accessorKey: 'discountPercentage',
  header: 'Discount Percentage',
},];




export const DT_COUPON_COLUMN = [
  {
    accessorKey: 'code',
    header: 'Code',
  },

  {
    accessorKey: 'discountPercentage',
    header: 'Discount Percentage',
  },

  {
    accessorKey: 'minShoppingAmount',
    header: 'Min Shopping Amount',
  },

  {
    accessorKey: 'validity',
    header: 'Validity',
    
Cell: ({ renderedCellValue }) => (
  new Date() > new Date(renderedCellValue)
    ? (
        <Chip
          color="error"
          label={new Date(renderedCellValue).toLocaleDateString('en-BD')}
        />
      )
    : (
        <Chip
          color="success"
          label={new Date(renderedCellValue).toLocaleDateString('en-BD')}
        />
      )
),


  }
];


export const DT_CUSTOMERS_COLUMN = [
  {
    accessorKey: 'avatar',
    header: 'Avatar',
    Cell: ({ renderedCellValue }) => (
      <Avatar>
        <AvatarImage src={renderedCellValue?.url || "/assets/user.png"} />
      </Avatar>
    ),
  },

  {
  accessorKey: 'name',
  header: 'Name',
},
{
  accessorKey: 'email',
  header: 'Email',
},
{
  accessorKey: 'phone',
  header: 'Phone',
},
{
  accessorKey: 'address',
  header: 'Address',
},
{
  accessorKey: 'isEmailVerified',
  header: 'Is Verified',
  Cell: ({ renderedCellValue }) => (
    renderedCellValue
      ? <Chip color="success" label="Verified" />
      : <Chip color="error" label="Not Verified" />
  )
},
{
  accessorKey: 'role',
  header: 'Role',
  Cell: ({ renderedCellValue }) => {
    const roleColor = {
      admin: 'error',
      manager: 'warning',
      staff: 'info',
      user: 'default',
    };
    return (
      <Chip
        size="small"
        color={roleColor[renderedCellValue] || 'default'}
        label={renderedCellValue || 'user'}
        className="capitalize"
      />
    );
  },
},

]


// Shared with components/ui/Application/Admin/OrderBoard.jsx so the
// History table and the order board agree on labels/colors.
export const ORDER_STATUS_COLOR = {
  placed: "info",
  preparing: "warning",
  ready: "primary",
  out_for_delivery: "secondary",
  delivered: "success",
  cancelled: "error",
};

export const ORDER_TYPE_LABEL = {
  delivery: "Delivery",
  pickup: "Pickup",
  dine_in: "Dine-in",
  takeaway: "Takeaway",
};

export const DT_ORDER_COLUMN = [
  {
    accessorKey: "orderNumber",
    header: "Order ID",
  },

  {
    accessorKey: "source",
    header: "Source",
    Cell: ({ renderedCellValue }) => (
      <Chip
        size="small"
        color={renderedCellValue === "pos" ? "secondary" : "primary"}
        label={renderedCellValue === "pos" ? "POS" : "Website"}
      />
    ),
  },

  {
    accessorKey: "orderType",
    header: "Type",
    Cell: ({ row }) => {
      const { orderType, table } = row.original;
      const label = ORDER_TYPE_LABEL[orderType] || orderType || "-";
      return <span>{label}{orderType === "dine_in" && table ? ` (Table ${table})` : ""}</span>;
    },
  },

  {
    accessorKey: "customer.name",
    header: "Name",
  },

  {
    accessorKey: "customer.phone",
    header: "Phone",
  },

  {
    accessorKey: "deliveryAddress.address",
    header: "Address",
  },

  {
    accessorKey: "items",
    header: "Total Item",
    Cell: ({ row }) => (
      <span>{row.original.items?.length || 0}</span>
    ),
  },

  {
    accessorKey: "subtotal",
    header: "Subtotal",
  },

{
  accessorKey: 'discount',
  header: 'Discount',
  Cell: ({ renderedCellValue }) => <span>{Math.round(renderedCellValue)}</span>,
},
 {
  accessorKey: "coupon.discountPercentage",
  header: "Coupon Discount (%)",
},
  {
    accessorKey: "total",
    header: "Total Amount",
  },

  {
    accessorKey: "payment.method",
    header: "Payment",
    Cell: ({ renderedCellValue }) => (
      <span className="uppercase">{renderedCellValue || "-"}</span>
    ),
  },

  {
    accessorKey: "payment.status",
    header: "Payment Status",
    Cell: ({ renderedCellValue }) => (
      <Chip
        size="small"
        color={renderedCellValue === "paid" ? "success" : renderedCellValue === "failed" ? "error" : "default"}
        label={renderedCellValue || "-"}
      />
    ),
  },

  {
    accessorKey: "orderStatus",
    header: "Status",
    Cell: ({ renderedCellValue }) => (
      <Chip
        size="small"
        color={ORDER_STATUS_COLOR[renderedCellValue] || "default"}
        label={(renderedCellValue || "-").replace("_", " ")}
      />
    ),
  },
];