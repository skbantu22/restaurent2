"use client";

import React, { useMemo, useCallback, useState } from "react";

import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import DatatableWrapperr from "@/components/ui/Application/Admin/DatatableWrapperr";
import DeleteAction from "@/components/ui/Application/Admin/DeleteAction";
import OrderBoard from "@/components/ui/Application/Admin/OrderBoard";

import {
  ADMIN_DASHBOARD,
  ADMIN_TRASH,
  ADMIN_ORDER_SHOW,
  ADMIN_ORDER_DETAILS,
} from "@/Route/Adminpannelroute";

import { DT_ORDER_COLUMN } from "@/lib/column";
import { columnConfig } from "@/lib/helperfunction";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import ViewAction from "@/components/ui/Application/Admin/ViewAction";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_ORDER_SHOW, label: "Orders" },
];

const TABS = [
  { key: "board", label: "Board" },
  { key: "history", label: "History" },
];

const ShowOrder = () => {
  const [view, setView] = useState("board");

  // ✅ columns config
  const columns = useMemo(() => {
    return columnConfig(DT_ORDER_COLUMN);
  }, []);

  // ✅ row action menu
  const action = useCallback((row, deleteType, handleDelete) => {
    const actionMenu = [];

    actionMenu.push(
      <ViewAction
        key="view"
        href={ADMIN_ORDER_DETAILS(row.original.orderNumber)}
      />,
    );

    // No standalone "Edit" action — an order's status (the one thing
    // staff actually change after it's placed) is updated from the
    // Details page or the Board. There's no real-restaurant workflow
    // for freely re-editing an order's items/prices after it's rung up.
    actionMenu.push(
      <DeleteAction
        key="delete"
        row={row}
        deleteType={deleteType}
        handleDelete={handleDelete}
      />,
    );

    return actionMenu;
  }, []);

  return (
    <div>
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="py-0 rounded shadow-sm">
        <CardHeader className="pt-3 px-3 border-b flex flex-row items-center justify-between">
          <h4 className="text-xl font-semibold">Orders</h4>

          <div className="flex gap-1 bg-muted rounded-md p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  view === tab.key
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pb-5 pt-4">
          {view === "board" ? (
            <OrderBoard />
          ) : (
            <DatatableWrapperr
              queryKey="orders-data"
              fetchUrl="/api/orders"
              initialPageSize={10}
              columnsConfig={columns}
              exportEndpoint="/api/orders/export"
              deleteEndpoint="/api/orders/delete"
              deleteType="SD"
              trashView={`${ADMIN_TRASH}?trashof=order`}
              createAction={action}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShowOrder;
