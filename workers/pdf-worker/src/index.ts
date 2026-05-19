import puppeteer from "@cloudflare/puppeteer";

interface Env {
  BROWSER: any;
  PDF_WORKER_SECRET?: string;
}

interface PdfRequest {
  html: string;
  headerTemplate?: string;
  footerTemplate?: string;
  watermark?: boolean;
  letterId?: number;
}

const MAX_HTML_BYTES = 2_000_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function unauthorized(): Response {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

function isLocalDev(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function assertAuthorized(request: Request, env: Env): Response | null {
  if (!env.PDF_WORKER_SECRET) {
    // Fail closed in production. `wrangler dev` (localhost) may run unauthenticated
    // for local testing; deployers should set PDF_WORKER_SECRET via `wrangler secret put`.
    return isLocalDev(request) ? null : unauthorized();
  }

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.PDF_WORKER_SECRET}`;
  return header === expected ? null : unauthorized();
}

function parsePdfRequest(value: unknown): PdfRequest {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be a JSON object");
  }

  const input = value as Partial<PdfRequest>;
  if (typeof input.html !== "string" || input.html.trim().length === 0) {
    throw new Error("html is required");
  }

  const htmlBytes = new TextEncoder().encode(input.html).byteLength;
  if (htmlBytes > MAX_HTML_BYTES) {
    throw new Error(`html exceeds ${MAX_HTML_BYTES} bytes`);
  }

  return {
    html: input.html,
    headerTemplate:
      typeof input.headerTemplate === "string" ? input.headerTemplate : "<div></div>",
    footerTemplate:
      typeof input.footerTemplate === "string" ? input.footerTemplate : "<div></div>",
    watermark: input.watermark === true,
    letterId: typeof input.letterId === "number" ? input.letterId : undefined,
  };
}

async function renderPdf(req: PdfRequest, env: Env): Promise<Uint8Array> {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    try {
      await page.setContent(req.html, { waitUntil: "load" });
      return await page.pdf({
        format: "Letter",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: req.headerTemplate,
        footerTemplate: req.footerTemplate,
        margin: { top: "72px", bottom: "48px", left: "0", right: "0" },
      });
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "GET") {
      return jsonResponse({ ok: true, service: "ttml-pdf-worker" });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const authError = assertAuthorized(request, env);
    if (authError) return authError;

    let pdfRequest: PdfRequest;
    try {
      pdfRequest = parsePdfRequest(await request.json());
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Invalid request" },
        400
      );
    }

    try {
      const pdf = await renderPdf(pdfRequest, env);
      const body = new ArrayBuffer(pdf.byteLength);
      new Uint8Array(body).set(pdf);
      return new Response(body, {
        headers: {
          "content-type": "application/pdf",
          "cache-control": "no-store",
          "x-ttml-pdf-source": "cloudflare-browser-rendering",
          ...(pdfRequest.letterId
            ? { "x-ttml-letter-id": String(pdfRequest.letterId) }
            : {}),
        },
      });
    } catch (err) {
      return jsonResponse(
        {
          error: "PDF rendering failed",
          detail: err instanceof Error ? err.message : String(err),
        },
        500
      );
    }
  },
};
