# TTML PDF Worker

Cloudflare Worker for rendering TTML letter HTML into PDFs using Cloudflare
Browser Rendering and `@cloudflare/puppeteer`.

The main app already knows how to call this worker through:

- `PDF_WORKER_URL`
- `PDF_WORKER_SECRET`

If this worker is not configured or fails, the app falls back to local
Puppeteer.

## Deploy

```bash
cd workers/pdf-worker
pnpm install
pnpm deploy
```

After deploy, Cloudflare prints a URL similar to:

```env
PDF_WORKER_URL="https://ttml-pdf-worker.<your-subdomain>.workers.dev"
```

Set a shared secret in Cloudflare:

```bash
pnpm wrangler secret put PDF_WORKER_SECRET
```

Set the same value in the main app environment:

```env
PDF_WORKER_SECRET="same-long-random-secret"
```

## Test Locally

```bash
pnpm dev
```

Then send a `POST` request with the same shape used by
`server/workerPdfClient.ts`:

```json
{
  "html": "<html><body><h1>Hello</h1></body></html>",
  "headerTemplate": "<div></div>",
  "footerTemplate": "<div></div>",
  "watermark": false,
  "letterId": 123
}
```

The response content type is `application/pdf`.
