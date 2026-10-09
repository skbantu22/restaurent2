import { redirect } from "next/navigation";

// The e-commerce shop was replaced by the restaurant ordering page.
export default async function ShopRedirect({ searchParams }) {
  const q = (await searchParams)?.q;
  redirect(q ? `/order-online?q=${encodeURIComponent(q)}` : "/order-online");
}
