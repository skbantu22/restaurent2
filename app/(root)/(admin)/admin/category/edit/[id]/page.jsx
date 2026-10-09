"use client";

import React, { use as usePromise, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "slugify";
import axios from "axios";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Link2,
  FileText,
  ImageIcon,
  LayoutGrid,
  X,
} from "lucide-react";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import {
  ADMIN_CATEGORY_EDIT,
  ADMIN_CATEGORY_SHOW,
  ADMIN_DASHBOARD,
} from "@/Route/Adminpannelroute";

import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import Editor from "@/components/ui/Application/Admin/Editor";
import MediaModal from "@/components/ui/Application/Admin/MediaModel";
import UploadMedia from "@/components/ui/Application/Admin/uploadmedia";

// Utilities & Config
import { zSchema } from "@/lib/zodschema";
import { z } from "zod";
import { showToast } from "@/lib/showToast";

const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_CATEGORY_SHOW, label: "Categories" },
  { href: ADMIN_CATEGORY_EDIT, label: "Edit Category" },
];

export default function EditCategory({ params }) {
  const queryClient = useQueryClient();
  const { id } = usePromise(params);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [resetKey, setResetKey] = useState(0);

  // Zod Schema matching category structure (_id, name, slug, description, media)
  const formSchema = zSchema
    .pick({
      _id: true,
      name: true,
      slug: true,
      description: true,
      media: true,
    })
    .extend({
      isBangladeshiSpecial: z.boolean().default(false),
    });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      _id: id || "",
      name: "",
      slug: "",
      description: "",
      media: [],
      isBangladeshiSpecial: false,
    },
  });

  const nameValue = useWatch({ control: form.control, name: "name" });

  // Auto slug generation from name change
  useEffect(() => {
    if (nameValue) {
      const baseSlug = slugify(nameValue, { lower: true, strict: true });
      form.setValue("slug", baseSlug, { shouldValidate: true });
    }
  }, [nameValue, form]);

  // Helper for Gallery / Media Selection
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

  // Fetch Category by ID & Populate Form
  useEffect(() => {
    if (!id) return;

    const fetchCategory = async () => {
      setPageLoading(true);
      try {
        const { data: res } = await axios.get(`/api/category/get/${id}`);
        if (!res?.success)
          throw new Error(res?.message || "Failed to load category");

        const data = res.data;
        console.log(data);

        form.reset({
          _id: data?._id || id,
          name: data?.name || "",
          slug: data?.slug || "",
          description: data?.description || "",
          media: data?.media?.map((m) => m._id) || [],
          isBangladeshiSpecial: Boolean(data?.isBangladeshiSpecial),
        });

        // Set initial media gallery states if media objects exist
        if (data?.media && Array.isArray(data.media)) {
          setSelectedMedia(data.media);
        }
        setResetKey((p) => p + 1);
      } catch (error) {
        showToast("error", error?.message || "Something went wrong");
      } finally {
        setPageLoading(false);
      }
    };

    fetchCategory();
  }, [id, form]);

  const onSubmit = async (values) => {
    // Clean text check for rich text editor description
    const cleanText = values.description
      ? values.description.replace(/<[^>]*>/g, "").trim()
      : "";
    if (!cleanText) {
      showToast("error", "Category description cannot be empty!");
      return;
    }

    setLoading(true);
    try {
      const { data: res } = await axios.put("/api/category/update", values);
      if (!res?.success) throw new Error(res?.message || "Update failed");
      showToast("success", res.message || "Category Updated Successfully!");
    } catch (error) {
      showToast(
        "error",
        error.response?.data?.message ||
          error?.message ||
          "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#f1f1f1] min-h-screen pb-20 font-sans">
      <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-4 space-y-6">
        {pageLoading ? (
          <div className="py-20 text-center text-sm font-bold uppercase text-zinc-500">
            Loading Category Data...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <BreadCrumb breadcrumbData={breadcrumbData} />
                  <h1 className="text-2xl font-black text-black tracking-tight uppercase">
                    Edit Category
                  </h1>
                </div>
                <ButtonLoading
                  type="submit"
                  loading={loading}
                  text="UPDATE CATEGORY"
                  className="bg-black hover:bg-zinc-800 text-white font-black px-10 rounded-none h-12 shadow-xl tracking-widest uppercase text-xs"
                />
              </div>

              {/* Hidden ID Field */}
              <input type="hidden" {...form.register("_id")} />

              {/* Category Details Card */}
              <Card className="border-2 border-black rounded-none shadow-none bg-white">
                <CardHeader className="bg-black py-3 rounded-none">
                  <CardTitle className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Category Identity
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-6">
                  {/* Category Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Category Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Summer Collection"
                            className="h-12 border-2 border-black rounded-none focus-visible:ring-0 text-base font-bold placeholder:text-zinc-300"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />

                  {/* Category Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mb-1">
                          <Link2 className="w-3 h-3 text-zinc-400" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            URL Slug (Auto-generated)
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="summer-collection"
                            {...field}
                            className="h-11 border-2 border-zinc-200 bg-zinc-50 rounded-none focus-visible:ring-0 font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />

                  {/* Category Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3 h-3 text-zinc-400" />
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Category Description *
                          </FormLabel>
                        </div>
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
                        <FormMessage className="text-[10px] uppercase font-bold" />
                      </FormItem>
                    )}
                  />

                  {/* Bangladeshi Special */}
                  <FormField
                    control={form.control}
                    name="isBangladeshiSpecial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between border-2 border-black p-3 bg-zinc-50 space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel className="text-xs font-black uppercase cursor-pointer">
                            Bangladeshi Special 🇧🇩
                          </FormLabel>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            Ticked: this category and its products show in the
                            Bangladeshi Special section. Unticked: they show in
                            Our Menu.
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

              {/* Media Gallery Card */}
              <Card className="border-2 border-black rounded-none shadow-none bg-white">
                <CardHeader className="bg-black py-3 rounded-none">
                  <CardTitle className="text-xs font-bold text-white uppercase flex items-center gap-2 tracking-[0.2em]">
                    <ImageIcon className="w-4 h-4" /> Category Banner / Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    {selectedMedia.map((m, index) => (
                      <div
                        key={m._id || index}
                        className="relative aspect-[3/4] border-2 border-black bg-zinc-50"
                      >
                        <Image
                          src={m.url || m.secure_url}
                          fill
                          alt="Category Media"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleSetSelectedMedia((p) =>
                              p.filter((x, i) =>
                                x._id ? x._id !== m._id : i !== index,
                              ),
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
                        + ADD MEDIA
                      </span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-black/10">
                    <p className="text-[10px] font-black uppercase opacity-50">
                      Cloud Upload:
                    </p>
                    <UploadMedia isMultiple={true} queryClient={queryClient} />
                  </div>
                </CardContent>
              </Card>

              {/* Info Tip */}
              <div className="bg-white border-l-4 border-black p-4 shadow-sm">
                <p className="text-[11px] font-medium text-zinc-600 leading-relaxed uppercase tracking-tight">
                  Tip: High-quality banner images and clear descriptions
                  significantly improve category SEO and user navigation.
                </p>
              </div>
            </form>
          </Form>
        )}
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
}
