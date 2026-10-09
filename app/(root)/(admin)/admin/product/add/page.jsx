"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import slugify from "slugify";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { X, ImageIcon, LayoutGrid } from "lucide-react";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Select from "@/components/ui/Select";
import Editor from "@/components/ui/Application/Admin/Editor";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";

// Utilities & Config
import { ADMIN_CATEGORY_SHOW, ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { z } from "zod";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Products" },
  { href: "#", label: "New Product" },
];

// Badge Options
const BADGE_OPTIONS = [
  { label: "None", value: "" },
  { label: "MUST TRY", value: "MUST TRY" },
  { label: "NEW", value: "NEW" },
  { label: "HOT", value: "HOT" },
  { label: "POPULAR", value: "POPULAR" },
  { label: "MEGA", value: "MEGA" },
];

// Custom Meal builder base tag — lets this product show up under
// "Select Beef/Chicken/Plant Based Items" in the meal builder
// (components/ui/Application/website/customorders.jsx) regardless of
// which display category it's filed under.
const MEAL_BUILDER_OPTIONS = [
  { label: "None", value: "" },
  { label: "Beef", value: "beef" },
  { label: "Chicken", value: "chicken" },
  { label: "Plant Based", value: "plant" },
];

const AddProduct = () => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [resetKey, setResetKey] = useState(0);

  // Schema synced with backend requirements
  const formSchema = zSchema
    .pick({
      name: true,
      slug: true,
      category: true,
      mrp: true,
      sellingPrice: true,
      discountPercentage: true,
      description: true,
      media: true,
      freeDelivery: true,
      calories: true,
    })
    .extend({
      subcategory: z.string().optional().or(z.literal("")),
      badge: z.string().optional().or(z.literal("")),
      isMostLoved: z.boolean().default(false),
      mealBuilderType: z.enum(["", "beef", "chicken", "plant"]).optional(),
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      category: "",
      subcategory: "",
      mrp: "",
      sellingPrice: "",
      discountPercentage: "0",
      description: "",
      media: [],
      freeDelivery: false,
      badge: "",
      isMostLoved: false,
      mealBuilderType: "",
      calories: "",
    },
  });

  // Category Fetching
  const { data: getCategory } = useFetch(
    "/api/category?deleteType=SD&size=10000",
  );
  // Bangladeshi Special tick: switches the category list between
  // Bangladeshi Special categories (e.g. Dhaka Flavours) and normal menu
  // categories. The product lands wherever its category is shown.
  const [bangladeshiSpecial, setBangladeshiSpecial] = useState(false);

  const categoryOption = useMemo(() => {
    if (getCategory?.success) {
      return getCategory.data
        .filter((cat) => Boolean(cat.isBangladeshiSpecial) === bangladeshiSpecial)
        .map((cat) => ({
          label: cat.name,
          value: cat._id,
        }));
    }
    return [];
  }, [getCategory, bangladeshiSpecial]);

  // Subcategory Fetching based on Category Selection
  const watchedCategoryId = form.watch("category");
  const subUrl = useMemo(
    () =>
      watchedCategoryId
        ? `/api/subcategory?category=${watchedCategoryId}&deleteType=SD`
        : null,
    [watchedCategoryId],
  );
  const { data: getSubCategory } = useFetch(subUrl);

  const subCategoryOption = useMemo(() => {
    if (getSubCategory?.success) {
      return getSubCategory.data.map((sub) => ({
        label: sub.name,
        value: sub._id,
      }));
    }
    return [];
  }, [getSubCategory]);

  // Helper for Gallery Media
  const handleSetSelectedMedia = (newMediaOrFn) => {
    setSelectedMedia((prev) => {
      const updated =
        typeof newMediaOrFn === "function" ? newMediaOrFn(prev) : newMediaOrFn;
      form.setValue(
        "media",
        updated.map((m) => m._id),
        { shouldValidate: true },
      );
      return updated;
    });
  };

  // Discount Calculation Helper
  const updateDiscount = (mrpVal, sellingVal) => {
    const mrp = Number(mrpVal);
    const selling = Number(sellingVal);
    if (mrp > 0 && selling > 0) {
      const discount = Math.max(0, Math.round(((mrp - selling) / mrp) * 100));
      form.setValue("discountPercentage", discount.toString());
    } else {
      form.setValue("discountPercentage", "0");
    }
  };

  const onSubmit = async (values) => {
    const cleanText = values.description.replace(/<[^>]*>/g, "").trim();
    if (!cleanText) {
      showToast("error", "Product description cannot be empty!");
      return;
    }

    setLoading(true);
    try {
      const { data: response } = await axios.post(
        "/api/product/create",
        values,
      );
      if (response?.success) {
        showToast("success", "Listing Published!");
        form.reset();
        setSelectedMedia([]);
        setResetKey((p) => p + 1);
      }
    } catch (error) {
      console.error("PRODUCT SUBMIT ERROR:", error);
      showToast(
        "error",
        error?.response?.data?.message || "Check required fields or connection",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f1f1f1] min-h-screen pb-20 lg:pb-10 font-sans">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <BreadCrumb breadcrumbData={breadcrumbData} />
                <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                  New Product
                </h1>
              </div>
              <ButtonLoading
                type="submit"
                loading={loading}
                text="PUBLISH PRODUCT"
                className="bg-black text-white px-10 rounded-none h-12 shadow-xl tracking-widest"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-6">
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                      Product Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Product Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Classic Fit Sweatshirt"
                              className="h-11 border-black rounded-none"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const nameVal = e.target.value;
                                if (nameVal) {
                                  const baseSlug = slugify(nameVal, {
                                    lower: true,
                                    strict: true,
                                  });
                                  const uniqueId = Date.now()
                                    .toString(36)
                                    .slice(-4);
                                  form.setValue(
                                    "slug",
                                    `${baseSlug}-${uniqueId}`,
                                    { shouldValidate: true },
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Description *
                          </FormLabel>
                          <FormControl>
                            <div className="border-2 border-black overflow-hidden bg-white">
                              <Editor
                                key={resetKey}
                                initialData={field.value}
                                onChange={(event, editor) =>
                                  field.onChange(editor.getData())
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Media Gallery Card */}
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                      {selectedMedia.map((m) => (
                        <div
                          key={m._id}
                          className="relative aspect-[3/4] border-2 border-black bg-zinc-50"
                        >
                          <Image
                            src={m.url || m.secure_url}
                            fill
                            alt="Gallery"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleSetSelectedMedia((p) =>
                                p.filter((x) => x._id !== m._id),
                              )
                            }
                            className="absolute top-1 right-1 bg-black text-white p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="aspect-[3/4] border-2 border-dashed border-black flex flex-col items-center justify-center gap-2 hover:bg-zinc-100 transition-colors"
                      >
                        <LayoutGrid className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase">
                          + ADD
                        </span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-black/10">
                      <p className="text-[10px] font-black uppercase opacity-50">
                        Cloud Upload:
                      </p>
                      <UploadMedia
                        isMultiple={true}
                        queryClient={queryClient}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="border-2 border-black rounded-none shadow-none bg-white">
                  <CardHeader className="bg-black py-3 rounded-none">
                    <CardTitle className="text-xs font-bold text-white uppercase">
                      Pricing & Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mrp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              MRP
                            </FormLabel>
                            <Input
                              className="h-10 border-black rounded-none"
                              type="number"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                updateDiscount(
                                  e.target.value,
                                  form.getValues("sellingPrice"),
                                );
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sellingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              Sale Price
                            </FormLabel>
                            <Input
                              className="h-10 border-black rounded-none font-bold text-blue-600"
                              type="number"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                updateDiscount(
                                  form.getValues("mrp"),
                                  e.target.value,
                                );
                              }}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">
                              Calories (kcal)
                            </FormLabel>

                            <FormControl>
                              <Input
                                type="number"
                                placeholder="680"
                                className="h-10 border-black rounded-none"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="bg-zinc-100 border-2 border-black p-3 text-center uppercase font-black text-xs italic">
                      Discount: {form.watch("discountPercentage") || 0}% OFF
                    </div>

                    {/* Bangladeshi Special tick */}
                    <label className="flex flex-row items-center justify-between border-2 border-black p-3 bg-zinc-50 cursor-pointer">
                      <div className="space-y-0.5">
                        <span className="block text-xs font-black uppercase">
                          Bangladeshi Special 🇧🇩
                        </span>
                        <span className="block text-[10px] text-zinc-500 font-medium">
                          Ticked: goes to the Bangladeshi Special section.
                          Unticked: goes to Our Menu.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={bangladeshiSpecial}
                        onChange={(e) => {
                          setBangladeshiSpecial(e.target.checked);
                          // the category list changes, so clear the old pick
                          form.setValue("category", "", { shouldValidate: false });
                        }}
                        className="w-5 h-5 accent-black cursor-pointer border-2 border-black"
                      />
                    </label>

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            {bangladeshiSpecial
                              ? "Bangladeshi Special Category"
                              : "Category"}
                          </FormLabel>
                          <Select
                            options={categoryOption}
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
                          />
                          {bangladeshiSpecial && categoryOption.length === 0 && (
                            <p className="text-[10px] text-red-600 font-medium">
                              No Bangladeshi Special category yet. Create one in
                              Category with the Bangladeshi Special tick.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <hr className="border-black border-dashed my-2" />

                    {/* Badge Select */}
                    <FormField
                      control={form.control}
                      name="badge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Product Badge / Tag
                          </FormLabel>
                          <Select
                            options={BADGE_OPTIONS}
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Meal Builder Select */}
                    <FormField
                      control={form.control}
                      name="mealBuilderType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase">
                            Custom Meal Builder
                          </FormLabel>
                          <Select
                            options={MEAL_BUILDER_OPTIONS}
                            placeholder="None"
                            selected={field.value}
                            setSelected={(val) =>
                              field.onChange(
                                typeof val === "string" ? val : val?.value,
                              )
                            }
                          />
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Show this item under Select Beef/Chicken/Plant
                            Based Items in the Custom Meal builder
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Our Most Loved Checkbox */}
                    <FormField
                      control={form.control}
                      name="isMostLoved"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between border-2 border-black p-3 bg-zinc-50 space-y-0">
                          <div className="space-y-0.5">
                            <FormLabel className="text-xs font-black uppercase cursor-pointer">
                              Our Most Loved 🔥
                            </FormLabel>
                            <p className="text-[10px] text-zinc-500 font-medium">
                              Show in "Our Most Loved" section
                            </p>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="w-5 h-5 accent-black cursor-pointer border-2 border-black"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>

      {/* Media Modal */}
      <MediaModal
        open={open}
        setOpen={setOpen}
        selectedMedia={selectedMedia}
        setSelectedMedia={handleSetSelectedMedia}
        isMultiple={true}
      />
    </div>
  );
};

export default AddProduct;
