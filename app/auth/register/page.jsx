"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import z from "zod";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { WEBSITE_LOGIN } from "@/Route/Websiteroute";
import axios from "axios";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";

export const formSchema = zSchema
  .pick({
    name: true,
    email: true,
    password: true,
  })
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password and confirm password must be same.',
    path: ['confirmPassword'],
  });

export default function Register() {
  const [loading, setloading] = useState(false);
  const [isTypePassword, setisTypepassword] = useState(true);
  const [isTypeconfirmPassword, setisTypeconfirmPassword] = useState(true);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleRegisterSubmit = async (values) => {
    try {
      setloading(true);
      const res = await axios.post("/api/auth/register", values);
      const registerResponse = res.data;

      if (!registerResponse.success) {
        throw new Error(registerResponse.message);
      }

      form.reset();
      showToast("success", registerResponse.message);
    } catch (error) {
      const msg =
        error?.response?.data?.message || error?.message || "Something went wrong";
      showToast("error", msg);
    } finally {
      setloading(false);
    }
  };

  const inputClass =
    "bg-black/40 border-[#214419] text-white placeholder:text-zinc-600 focus-visible:ring-[#E1262D]/30 focus-visible:border-[#E1262D]/50";
  const labelClass = "text-xs uppercase font-bold text-zinc-400 tracking-wider";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full flex items-center justify-center"
    >
      <Card className="w-full max-w-sm border-[#214419] bg-[#0F2109] shadow-2xl shadow-black/50">
        <CardHeader>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-wide text-white">
              Create Account
            </h1>
            <p className="text-sm text-zinc-400">
              Sign up to start ordering with Shawon Food Gate
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegisterSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} className={inputClass} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} className={inputClass} />
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
                    <FormLabel className={labelClass}>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={isTypePassword ? "password" : "text"}
                          placeholder="••••••••"
                          {...field}
                          className={`${inputClass} pr-10`}
                        />
                      </FormControl>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#E1262D] transition-colors"
                        onClick={() => setisTypepassword(!isTypePassword)}
                        type="button"
                      >
                        {isTypePassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Confirm Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={isTypeconfirmPassword ? "password" : "text"}
                          placeholder="••••••••"
                          {...field}
                          className={`${inputClass} pr-10`}
                        />
                      </FormControl>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-[#E1262D] transition-colors"
                        onClick={() => setisTypeconfirmPassword(!isTypeconfirmPassword)}
                        type="button"
                      >
                        {isTypeconfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <ButtonLoading
                type="submit"
                className="w-full h-11 text-sm font-bold uppercase tracking-wide bg-[#E1262D] hover:bg-[#EE3B41] text-white transition-all"
                loading={loading}
                text="Create Account"
              />

              <div className="text-center">
                <div className="flex gap-1 justify-center text-sm text-zinc-400">
                  <p>Already have an account?</p>
                  <Link href={WEBSITE_LOGIN} className="font-semibold text-[#E1262D] hover:underline">
                    Sign in
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
