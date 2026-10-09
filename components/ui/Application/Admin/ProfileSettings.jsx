"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { login } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";

const DEFAULT_AVATAR = "/assets/avatar-default.svg";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const inputClass =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 pr-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-900";

function IconField({ label, icon: Icon, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        {children}
      </div>
      {hint && <span className="mt-1 block text-[11px] text-zinc-400">{hint}</span>}
    </label>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        type={show ? "text" : "password"}
        className={`${inputClass} pr-10`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ProfileSettings() {
  const dispatch = useDispatch();
  const auth = useSelector((store) => store.authStore.auth);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    axios
      .get("/api/admin/profile")
      .then(({ data }) => {
        if (!data?.success) throw new Error(data?.message);
        setProfile(data.data);
        setForm({
          name: data.data.name || "",
          phone: data.data.phone || "",
          address: data.data.address || "",
          city: data.data.city || "",
        });
      })
      .catch((error) =>
        showToast("error", error?.response?.data?.message || "Failed to load profile."),
      )
      .finally(() => setLoading(false));
  }, []);

  // free the temporary preview URL when it changes / on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const currentAvatar = removeAvatar
    ? DEFAULT_AVATAR
    : avatarPreview || profile?.avatar?.url || DEFAULT_AVATAR;
  const hasCustomAvatar = !removeAvatar && (avatarPreview || profile?.avatar?.url);

  const isDirty =
    !!profile &&
    (avatarFile ||
      removeAvatar ||
      form.name !== (profile.name || "") ||
      form.phone !== (profile.phone || "") ||
      form.address !== (profile.address || "") ||
      form.city !== (profile.city || ""));

  const handlePickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("error", "Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast("error", "Profile picture must be under 5 MB.");
      return;
    }

    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    setRemoveAvatar(true);
  };

  const handleReset = () => {
    if (!profile) return;
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      address: profile.address || "",
      city: profile.city || "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
    setRemoveAvatar(false);
  };

  // Keep the admin top-bar avatar/name in sync without a re-login. The
  // stored auth is either the login response ({ data: { user } }) or a
  // plain user object, so update whichever shape is there.
  const syncAuthStore = (updated) => {
    if (!auth) return;
    const patch = { name: updated.name, phone: updated.phone, address: updated.address, city: updated.city, avatar: updated.avatar };
    if (auth?.data?.user) {
      dispatch(login({ ...auth, data: { ...auth.data, user: { ...auth.data.user, ...patch } } }));
    } else if (auth?.user) {
      dispatch(login({ ...auth, user: { ...auth.user, ...patch } }));
    } else {
      dispatch(login({ ...auth, ...patch }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      showToast("error", "Name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      const body = new FormData();
      body.append("name", form.name.trim());
      body.append("phone", form.phone.trim());
      body.append("address", form.address.trim());
      body.append("city", form.city.trim());
      if (avatarFile) body.append("file", avatarFile);
      if (removeAvatar) body.append("removeAvatar", "true");

      const { data } = await axios.put("/api/admin/profile", body);
      if (!data?.success) throw new Error(data?.message);

      setProfile(data.data);
      setAvatarFile(null);
      setAvatarPreview("");
      setRemoveAvatar(false);
      syncAuthStore(data.data);
      showToast("success", "Profile updated.");
    } catch (error) {
      showToast("error", error?.response?.data?.message || error?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.next.length < 8) {
      showToast("error", "New password must be at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      showToast("error", "New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { data } = await axios.put("/api/admin/profile/password", {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      if (!data?.success) throw new Error(data?.message);
      setPasswords({ current: "", next: "", confirm: "" });
      showToast("success", "Password changed.");
    } catch (error) {
      showToast("error", error?.response?.data?.message || error?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading profile...
      </div>
    );
  }

  if (!profile) {
    return <p className="py-10 text-sm text-zinc-500">Could not load your profile.</p>;
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <form
        onSubmit={handleSave}
        className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm"
      >
        {/* Cover */}
        <div className="h-24 bg-gradient-to-r from-orange-500 via-orange-600 to-zinc-900" />

        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + identity */}
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative h-24 w-24 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAvatar}
                  alt={form.name || "Profile picture"}
                  className="h-24 w-24 rounded-full border-4 border-white dark:border-zinc-950 bg-zinc-100 object-cover shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white dark:border-zinc-950 bg-orange-500 text-white shadow transition hover:bg-orange-600"
                  aria-label="Change profile picture"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePickAvatar}
                />
              </div>

              <div className="pb-1">
                <h2 className="text-lg font-bold leading-tight">{form.name || "Your name"}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 font-semibold capitalize text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                    <ShieldCheck className="h-3 w-3" />
                    {profile.role}
                  </span>
                  <span>{profile.email}</span>
                  {memberSince && <span>· Member since {memberSince}</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <Camera className="h-3.5 w-3.5" /> Upload photo
              </button>
              {hasCustomAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
          </div>

          <p className="mt-3 text-[11px] text-zinc-400">JPG, PNG or WebP, up to 5 MB. Square photos look best.</p>

          {/* Details */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <IconField label="Full name" icon={User}>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                autoComplete="name"
              />
            </IconField>

            <IconField label="Email" icon={Mail} hint="Email is your login and can't be changed here.">
              <input className={inputClass} value={profile.email} disabled />
            </IconField>

            <IconField label="Phone" icon={Phone}>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. 020 7123 4567"
                autoComplete="tel"
              />
            </IconField>

            <IconField label="City" icon={MapPin}>
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="e.g. London"
                autoComplete="address-level2"
              />
            </IconField>

            <div className="sm:col-span-2">
              <IconField label="Address" icon={MapPin}>
                <input
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                  autoComplete="street-address"
                />
              </IconField>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-5">
            {isDirty && (
              <span className="mr-auto text-xs font-medium text-orange-600">You have unsaved changes</span>
            )}
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {/* Password card */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-8 shadow-sm"
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold">Change password</h3>
            <p className="text-xs text-zinc-500">Use at least 8 characters.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Current password</span>
            <PasswordInput
              value={passwords.current}
              onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">New password</span>
            <PasswordInput
              value={passwords.next}
              onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Confirm new password</span>
            <PasswordInput
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={savingPassword || !passwords.current || !passwords.next || !passwords.confirm}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}
