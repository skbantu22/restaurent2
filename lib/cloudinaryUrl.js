// Pure string helper — safe to import in client components (no SDK, no
// secrets, unlike lib/cloudinary.js which configures the server-side
// upload SDK). Inserts a Cloudinary transformation segment right after
// "/image/upload/" so a raw uploaded image is served pre-cropped,
// auto-quality, and in a modern format instead of shipping the full
// original and letting the browser scale/crop it with plain CSS.
export function cloudinaryResize(url, { width, height, crop = "fill", gravity = "auto" } = {}) {
  if (!url || typeof url !== "string") return url;

  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary URL — leave untouched

  const parts = [`c_${crop}`, `g_${gravity}`, "q_auto", "f_auto"];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);

  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}${parts.join(",")}/${url.slice(insertAt)}`;
}
