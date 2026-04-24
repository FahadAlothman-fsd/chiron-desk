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

  // TODO: Validate launch token/session claims before accepting survey creation requests.
  // TODO: Exchange launch payload with the survey provider once integration details are finalized.
  return new Response(
    JSON.stringify({
      status: "scaffold",
      message:
        "Survey launch endpoint scaffold is wired, but provider integration is not implemented yet.",
    }),
    {
      status: 202,
      headers: jsonHeaders,
    },
  );
};
