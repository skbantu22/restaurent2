import { sendMetaCapiEvent } from "@/lib/meta/capi";

export async function POST(req) {
  try {
    const body = await req.json();
    const result = await sendMetaCapiEvent(body);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
