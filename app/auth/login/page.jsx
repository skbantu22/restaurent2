"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { Eye, EyeOff, LayoutDashboard, ChefHat, UserCog, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

// UI Components - Ensure these paths match your project structure
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormLabel,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

// Utils & State
import { WEBSITE_REGISTER, WEBSITE_USER_DASHBOARD } from "@/Route/Websiteroute";
import { zSchema } from "@/lib/zodschema";
import { login } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

// Validation Schema
export const formSchema = zSchema
  .pick({ email: true })
  .extend({
    password: zSchema.shape?.password ?? undefined,
  })
  .superRefine((val, ctx) => {
    if (!val.password || val.password.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password field is required.",
      });
    }
  });

export default function Login() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isTypePassword, setisTypepassword] = useState(true);
  const [serverMsg, setServerMsg] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      const { data: registerResponse } = await axios.post(
        "/api/auth/login",
        values,
      );

      if (!registerResponse.success) {
        throw new Error(registerResponse.message);
      }

      dispatch(login(registerResponse));
      if (searchParams.has("callback")) {
        window.location.assign(searchParams.get("callback"));
      } else {
        // Staff/admin accounts land in the admin panel; everyone else
        // (customers) goes to their own account page — this previously
        // sent every role to /admin/dashboard regardless.
        // The login API returns { data: { user: { role } } }
        const loggedInRole = registerResponse.data?.user?.role || registerResponse.data?.role;
        // Full page load (not router.push) so the new login cookie is used
        // straight away instead of a cached "not logged in" redirect.
        window.location.assign(
          ["admin", "manager", "staff"].includes(loggedInRole)
            ? ADMIN_DASHBOARD
            : WEBSITE_USER_DASHBOARD,
        );
      }

      form.reset();
      showToast("success", registerResponse.message);
    } catch (error) {
      showToast("error", error.message);
      setServerMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Demo only: one-click login per role, no password (NEXT_PUBLIC_DEMO_ADMIN_LOGIN)
  const [demoLoading, setDemoLoading] = useState("");
  const handleDemo = async (role) => {
    try {
      setDemoLoading(role);
      const { data } = await axios.post("/api/auth/demo-login", { role });
      if (!data.success) throw new Error(data.message);
      dispatch(login(data));
      showToast("success", data.message);
      window.location.assign(role === "user" ? WEBSITE_USER_DASHBOARD : role === "staff" ? "/admin/pos" : ADMIN_DASHBOARD);
    } catch (error) {
      showToast("error", error.response?.data?.message || error.message);
      setDemoLoading("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full flex items-center justify-center"
    >
      <Card className="w-full max-w-[400px] border-[#214419] bg-[#0F2109] shadow-2xl shadow-black/50">
        <CardHeader className="pt-8 pb-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">
              Welcome Back
            </h1>
            <p className="text-sm text-zinc-400">
              Sign in to order, track, and save your favourites
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLoginSubmit)}
              className="space-y-4"
            >
              {serverMsg && (
                <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  <p className="text-center text-xs font-medium text-destructive">
                    {serverMsg}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="name@company.com"
                        {...field}
                        className="h-11 bg-black/40 border-[#214419] text-white placeholder:text-zinc-600 focus-visible:ring-[#E1262D]/30 focus-visible:border-[#E1262D]/50"
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-zinc-400 tracking-wider">
                      Password
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={isTypePassword ? "password" : "text"}
                          placeholder="••••••••"
                          {...field}
                          className="h-11 pr-10 bg-black/40 border-[#214419] text-white placeholder:text-zinc-600 focus-visible:ring-[#E1262D]/30 focus-visible:border-[#E1262D]/50"
                        />
                      </FormControl>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#E1262D] transition-colors"
                        onClick={() => setisTypepassword(!isTypePassword)}
                        type="button"
                      >
                        {isTypePassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                    <div className="flex justify-end">
                      <Link
                        href="/auth/reset-password"
                        name="password"
                        className="text-xs font-medium text-[#E1262D] hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </FormItem>
                )}
              />

              <ButtonLoading
                type="submit"
                className="w-full h-11 text-sm font-bold uppercase tracking-wide bg-[#E1262D] hover:bg-[#EE3B41] text-white transition-all"
                loading={loading}
                text="Sign In"
              />

              {process.env.NEXT_PUBLIC_DEMO_ADMIN_LOGIN === "true" && (
                <div className="rounded-xl border border-dashed border-[#F7C318]/50 bg-[#F7C318]/5 p-3">
                  <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#F7C318]">
                    Demo · one-click login, no password
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["admin", "Admin", LayoutDashboard, "bg-[#F7C318] text-[#0A1806]"],
                      ["manager", "Manager", UserCog, "bg-[#2D7DD2] text-white"],
                      ["staff", "Kitchen / POS", ChefHat, "bg-[#7B2CBF] text-white"],
                      ["user", "Customer", UserIcon, "bg-[#E1262D] text-white"],
                    ].map(([role, label, Icon, cls]) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleDemo(role)}
                        disabled={!!demoLoading}
                        className={`flex h-11 items-center justify-center gap-2 rounded-md text-[13px] font-extrabold transition-all hover:brightness-110 disabled:opacity-60 ${cls}`}
                      >
                        <Icon size={16} />
                        {demoLoading === role ? "Opening…" : label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#214419]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0F2109] px-2 text-zinc-500">
                    New here?
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={WEBSITE_REGISTER}
                    className="font-semibold text-[#E1262D] hover:underline"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
