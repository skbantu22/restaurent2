"use client";

import Breadcums from "@/components/ui/Application/Admin/Breadcums";
import { WEBSITE_PRODUCT_DETAILS } from "@/Route/Websiteroute";
import { ADMIN_ORDER_SHOW } from "@/Route/Adminpannelroute";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import placeholderImg from "@/public/assets/img-placeholder.webp";
import { use, useEffect, useState } from "react";
import useFetch from "@/hooks/useFetch";
import Select from "@/components/ui/Select";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { showToast } from "@/lib/showToast";

const OrderDetails = ({ params }) => {
  const { order_id } = use(params);

  const [orderData, setOrderData] = useState(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // fetch order data
  const { data, loading, error } = useFetch(
    order_id ? `/api/orders/get/${order_id}` : null,
  );

  useEffect(() => {
    if (data?.success) {
      setOrderData(data.data);
      setOrderStatus(data.data.orderStatus);
    }
  }, [data]);

  const statusOptions = [
    { label: "Placed", value: "placed" },
    { label: "Preparing", value: "preparing" },
    { label: "Ready", value: "ready" },
    { label: "Out For Delivery", value: "out_for_delivery" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const breadCrumbData = [
    { label: "Home", href: "/" },
    { label: "Orders", href: ADMIN_ORDER_SHOW },
    { label: "Order Details" },
  ];

  const handleOrderStatus = async () => {
    setUpdatingStatus(true);

    try {
      console.log("SEND DATA:", {
        _id: orderData?._id,
        status: orderStatus,
      });

      const { data: response } = await axios.put("/api/orders/update-status", {
        _id: orderData?._id,
        status: orderStatus,
      });

      if (!response.success) {
        throw new Error(response.message);
      }

      showToast("success", response.message);

      setOrderData((prev) => ({
        ...prev,
        orderStatus: orderStatus,
      }));
    } catch (error) {
      console.log(error);
      showToast("error", error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10">
      <Breadcums items={breadCrumbData} />

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-32">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-gray-500">
              Loading order details...
            </p>
          </div>
        </div>
      )}

      {/* Error / Not Found */}
      {!loading && (!data || !data.success) && (
        <div className="flex justify-center items-center py-32">
          <div className="text-center">
            <h4 className="text-red-500 text-2xl font-bold">Order Not Found</h4>
            <p className="text-gray-500 mt-2">
              We couldn&apos;t find the order with ID: {order_id}
            </p>
            <Link
              href={ADMIN_ORDER_SHOW}
              className="text-blue-600 underline mt-4 inline-block"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      )}

      {/* Success State */}
      {!loading && orderData && (
        <>
          {/* Order Info */}
          <div className="mt-6 space-y-2 text-sm sm:text-base">
            <p>
              <b>Order Id:</b> {orderData.orderNumber}
            </p>
            <p className="capitalize">
              <b>Source:</b> {orderData.source === "pos" ? "POS" : "Website"}
            </p>
            <p className="capitalize">
              <b>Order Type:</b> {(orderData.orderType || "").replace("_", " ")}
              {orderData.orderType === "dine_in" && orderData.table
                ? ` (Table ${orderData.table})`
                : ""}
            </p>
            <p className="uppercase">
              <b className="normal-case">Payment Method:</b> {orderData.payment?.method || "N/A"}
            </p>
            <p className="capitalize">
              <b>Payment Status:</b> {orderData.payment?.status || "N/A"}
            </p>
            <p>
              <b>Transaction Id:</b>{" "}
              {orderData.payment?.transactionId ||
                orderData.payment?.paymentIntentId ||
                "N/A"}
            </p>
            <p className="capitalize">
              <b>Status:</b> {orderData.orderStatus}
            </p>
          </div>

          {/* Order Table */}
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-[600px] w-full border border-gray-200">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-center">Price</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {orderData.items?.map((item) => (
                  <tr key={item.productId?._id} className="border-b">
                    <td className="p-3">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-start sm:items-center">
                        <Image
                          src={
                            item.image ||
                            item.productId?.media?.[0]?.secure_url ||
                            placeholderImg.src
                          }
                          width={60}
                          height={60}
                          alt={item.name || "product"}
                          className="rounded object-cover"
                        />

                        <div>
                          <Link
                            href={WEBSITE_PRODUCT_DETAILS(item.productId?.slug)}
                            className="font-medium line-clamp-1 hover:text-primary"
                          >
                            {item.name || item.productId?.name}
                          </Link>

                          {item.color && (
                            <p className="text-xs text-gray-500">
                              Color: {item.color}
                            </p>
                          )}

                          {item.size && (
                            <p className="text-xs text-gray-500">
                              Size: {item.size}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-3 text-sm">
                      {item.price?.toLocaleString("en-GB", {
                        style: "currency",
                        currency: "GBP",
                      })}
                    </td>
                    <td className="text-center p-3">{item.quantity}</td>
                    <td className="text-center p-3 text-sm">
                      {(item.quantity * item.price).toLocaleString("en-GB", {
                        style: "currency",
                        currency: "GBP",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t">
                  <td colSpan={3} className="text-right p-3">
                    Subtotal:
                  </td>
                  <td className="text-center p-3">
                    {orderData.subtotal?.toLocaleString("en-BD", {
                      style: "currency",
                      currency: "GBP",
                    })}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td colSpan={3} className="text-right p-3">
                    Delivery Fee:
                  </td>
                  <td className="text-center p-3">
                    {(orderData.deliveryFee || 0).toLocaleString("en-GB", {
                      style: "currency",
                      currency: "GBP",
                    })}
                  </td>
                </tr>
                {orderData.discount > 0 && (
                  <tr className="font-semibold text-green-600">
                    <td colSpan={3} className="text-right p-3">
                      Discount:
                    </td>
                    <td className="text-center p-3">
                      -
                      {orderData.discount?.toLocaleString("en-GB", {
                        style: "currency",
                        currency: "GBP",
                      })}
                    </td>
                  </tr>
                )}
                <tr className="font-bold bg-gray-100">
                  <td colSpan={3} className="text-right p-3 text-lg">
                    Total:
                  </td>
                  <td className="text-center p-3 text-lg">
                    {orderData.total?.toLocaleString("en-GB", {
                      style: "currency",
                      currency: "GBP",
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customer + Status */}
          <div className="mt-10 grid md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-lg font-semibold mb-2">Customer Info</h3>
              <p>
                <b>Name:</b> {orderData.customer?.name}
              </p>
              <p>
                <b>Phone:</b> {orderData.customer?.phone}
              </p>
              {orderData.orderType === "delivery" && (
                <p>
                  <b>Address:</b> {orderData.deliveryAddress?.address}
                  {orderData.deliveryAddress?.city
                    ? `, ${orderData.deliveryAddress.city}`
                    : ""}
                  {orderData.deliveryAddress?.postcode
                    ? `, ${orderData.deliveryAddress.postcode}`
                    : ""}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-2">
                Update Order Status
              </h4>
              <Select
                options={statusOptions}
                selected={orderStatus}
                setSelected={(value) => setOrderStatus(value)}
                placeholder="Select Status"
                isMulti={false}
              />
              <ButtonLoading
                type="button"
                onClick={handleOrderStatus}
                text="Save Status"
                className="mt-4 w-full sm:w-auto"
                loading={updatingStatus}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrderDetails;
