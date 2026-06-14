import type { Express } from "express";
import { SERVICE_SLUGS } from "@shared/serviceSlugs";
import { getPublishedBlogSlugs } from "./db";
import { logger } from "./logger";

const BASE = "https://www.talk-to-my-lawyer.com";

// Stable, content-derived last-modified date for static marketing pages.
// Deliberately NOT `new Date()` at boot: re-stamping every static URL to the
// deploy timestamp on each release teaches crawlers that <lastmod> is
// unreliable (everything always "changed today"), and Google then ignores the
// signal. Bump this constant when static/service page copy materially changes.
// Blog posts below keep their real per-row updatedAt/publishedAt instead.
const STATIC_CONTENT_LAST_MODIFIED = "2026-06-14";

const STATIC_URLS: { loc: string; changefreq: string; priority: string; lastmod: string }[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  { loc: "/pricing", changefreq: "monthly", priority: "0.9", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  // /analyze removed from sitemap 2026-05-20 — Doc Analyzer disabled; route
  // now redirects to /. Avoids search engines indexing a redirect target.
  { loc: "/faq", changefreq: "monthly", priority: "0.8", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  { loc: "/services", changefreq: "monthly", priority: "0.8", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  { loc: "/blog", changefreq: "weekly", priority: "0.8", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  { loc: "/terms", changefreq: "yearly", priority: "0.3", lastmod: STATIC_CONTENT_LAST_MODIFIED },
  { loc: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: STATIC_CONTENT_LAST_MODIFIED },
];

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  let xml = `  <url>\n    <loc>${escapeXml(BASE + loc)}</loc>\n`;
  if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  return xml;
}

export function registerSitemapRoute(app: Express): void {
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const blogPosts = await getPublishedBlogSlugs();

      const urls: string[] = [];

      for (const s of STATIC_URLS) {
        urls.push(urlEntry(s.loc, s.changefreq, s.priority, s.lastmod));
      }

      for (const slug of SERVICE_SLUGS) {
        urls.push(urlEntry(`/services/${slug}`, "monthly", "0.7", STATIC_CONTENT_LAST_MODIFIED));
      }

      for (const post of blogPosts) {
        const lastmod = formatDate(post.updatedAt ?? post.publishedAt);
        urls.push(urlEntry(`/blog/${post.slug}`, "weekly", "0.6", lastmod || undefined));
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      logger.error({ err: err }, "[sitemap] Error generating sitemap:");
      res.status(500).setHeader("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });
}
