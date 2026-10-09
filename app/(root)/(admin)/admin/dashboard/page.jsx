"use client";

import React from "react";
import { motion } from "framer-motion";

import CountOverview from "./CountOverview";
import SalesOverview from "./SalesOverview";
import QuickAdd from "./QuickAdd";
import Earnings from "./Earnings";
import SalesByCategory from "./SalesByCategory";
import OrdersByChannel from "./OrdersByChannel";
import TopSellingItems from "./TopSellingItems";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OrderStatus } from "./OrderStatus";
import LatestOrder from "./LatestOrder";
import { ADMIN_ORDER_SHOW } from "@/Route/Adminpannelroute";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Page = () => {
  return (
    <div className="pb-10">
      <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.35 }}>
        <CountOverview />
      </motion.div>

      <SalesOverview />

      <QuickAdd />

      <div className="mt-8 grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Earnings />

          <div className="grid md:grid-cols-2 gap-6">
            <SalesByCategory />
            <OrdersByChannel />
          </div>
        </div>

        <div className="space-y-6">
          <TopSellingItems />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <Card className="p-0">
              <CardHeader className="py-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Orders Status</span>
                </div>
              </CardHeader>

              <CardContent>
                <OrderStatus />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="mt-6"
      >
        <Card className="rounded-lg p-0">
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Latest Orders</span>
              <Button type="button" asChild>
                <Link href={ADMIN_ORDER_SHOW}>View All</Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <LatestOrder />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Page;
