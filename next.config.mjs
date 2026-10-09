/** @type {import('next').NextConfig} */
const nextConfig = {
  // The old e-commerce shop is replaced by restaurant online ordering
  async redirects() {
    return [{ source: "/shop", destination: "/order-online", permanent: false }];
  },
  images: {
    domains: ["via.placeholder.com"], // ✅ here

    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
        search: "",
      },

      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
      },
    ],
  },
};

export default nextConfig;
