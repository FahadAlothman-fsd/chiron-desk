import type { APIRoute } from "astro";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({
      error: `Method ${request.method} not allowed. Use POST.`,
    }),
    {
      status: 405,
      headers: {
        ...jsonHeaders,
        allow: "POST",
      },
    },
  );
};

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return new Response(JSON.stringify({ error: "Expected application/json request body." }), {
      status: 415,
      headers: jsonHeaders,
    });
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Malformed JSON body." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  // TODO: Verify the webhook signature before trusting the payload.
  // TODO: Map provider webhook events into internal ingestion jobs once the survey contract is defined.
  return new Response(
    JSON.stringify({
      status: "scaffold",
      message:
        "Survey webhook endpoint scaffold received a payload, but ingestion is not implemented yet.",
    }),
    {
      status: 202,
      headers: jsonHeaders,
    },
  );
};
