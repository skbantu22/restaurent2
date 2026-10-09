"use client";

import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import { BiCategory } from "react-icons/bi";
import { MdOutlineFastfood, MdOutlineLocalOffer, MdOutlineUpload } from "react-icons/md";
import {
  ADMIN_CATEGORY_ADD,
  ADMIN_COUPON_ADD,
  ADMIN_MEDIA_SHOW,
  ADMIN_PRODUCT_ADD,
} from "@/Route/Adminpannelroute";

const QUICK_LINKS = [
  { label: "Add Category", href: ADMIN_CATEGORY_ADD, icon: <BiCategory size={20} /> },
  { label: "Add Product", href: ADMIN_PRODUCT_ADD, icon: <MdOutlineFastfood size={20} /> },
  { label: "Add Coupon", href: ADMIN_COUPON_ADD, icon: <MdOutlineLocalOffer size={20} /> },
  { label: "Upload Media", href: ADMIN_MEDIA_SHOW, icon: <MdOutlineUpload size={20} /> },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const QuickAdd = () => {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid lg:grid-cols-4 sm:grid-cols-2 gap-4 mt-6"
    >
      {QUICK_LINKS.map((link) => (
        <Link key={link.label} href={link.href}>
          <motion.div
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between p-3 rounded-lg shadow bg-gradient-to-tr from-orange-400 via-orange-500 to-orange-600"
          >
            <h4 className="font-medium text-white">{link.label}</h4>

            <span className="w-12 h-12 border border-white/30 flex justify-center items-center rounded-full text-white shrink-0">
              {link.icon}
            </span>
          </motion.div>
        </Link>
      ))}
    </motion.div>
  );
};

export default QuickAdd;
