# Frontend - Current State

> **Last verified:** 2026-05-17 against `client/src/App.tsx`, glob of `client/src/pages/**/*.tsx`, `client/src/index.css`, `server/spaRoutes.ts`, `server/_core/vite.ts`, `server/_core/prerenderCache.ts`, `scripts/prerender.ts`, `client/public/robots.txt`, `client/public/llms.txt`, `package.json`, and referenced `vite.config.ts`.

React 19 + Vite 8 SPA. wouter routing. Tailwind CSS v4 with OKLCH theme. shadcn/ui on Radix. tRPC + TanStack Query v5. The user app is still client-rendered, but public crawler surfaces now get server-side SEO injection and build-time prerendered HTML for data-free marketing/service routes.

---

## 1. Entry And Routing

- **Entry point:** [`client/src/main.tsx`](../../../client/src/main.tsx) initializes Sentry, mounts `<App />`, wires tRPC + TanStack Query providers, and applies `ThemeContext`.
- **Routes:** [`client/src/App.tsx`](../../../client/src/App.tsx) defines all wouter `<Route>` / `<Switch>` routes. Every new page must be registered here.
- **Lazy loading:** pages use `React.lazy` wrapped in `lazyRetry` for chunk reload recovery. Use the wrapper, not raw `lazy`.

---

## 2. Pages By Role

### Public

```
Home.tsx
Login.tsx, Signup.tsx, AcceptInvitation.tsx, ForgotPassword.tsx, ResetPassword.tsx, VerifyEmail.tsx
Pricing.tsx, FAQ.tsx, Terms.tsx, Privacy.tsx
BlogIndex.tsx, BlogPost.tsx
ContentCalendar.tsx, NewsletterTemplate.tsx
Onboarding.tsx
NotFound.tsx
ClientPortal.tsx
services/
  ServicesIndex.tsx
  ServicePage.tsx
  ServiceRoute.tsx
DocumentAnalyzer/
  index.tsx
  FileUploadZone.tsx
  AnalysisResults.tsx
```

### Subscriber

```
subscriber/
  Dashboard.tsx
  LetterDetail.tsx
  MyLetters.tsx
  SubmitLetter.tsx
  intake-steps/
  IntakeFormTemplates.tsx
  TemplateGallery.tsx
  Billing.tsx
  Receipts.tsx
  Profile.tsx
```

### Attorney

```
attorney/
  Dashboard.tsx
  ReviewQueue.tsx
  ReviewCentre.tsx
  ReviewDetail/index.tsx
  review/
```

### Employee / Affiliate

```
employee/
  AffiliateDashboard/
```

### Admin

```
admin/
  Dashboard.tsx
  Verify2FA.tsx
  AllLetters.tsx
  LetterDetail.tsx
  AdminSubmitLetter.tsx
  Users.tsx
  Templates.tsx
  Jobs.tsx
  PipelineAnalytics.tsx
  QualityDashboard.tsx
  BlogEditor.tsx
  Affiliate/
  Learning/
```

---

## 3. Public SEO And Crawler Rendering

- `server/spaRoutes.ts` is the source of truth for crawlable route metadata, canonical tags, real 404s, `X-Robots-Tag` policy, and fallback HTML injected into the SPA shell for JS-blind crawlers.
- Public route metadata covers `/`, `/pricing`, `/analyze`, `/faq`, `/terms`, `/privacy`, `/blog`, `/services`, and each service slug from `shared/serviceSlugs.ts`.
- `/blog/:slug` fallback HTML is generated from the published blog post body. `/blog` gets recent published post links. `/services` gets service links. `/services/:slug` gets per-service fallback copy.
- `scripts/prerender.ts` runs during `pnpm build` after Vite/esbuild. It prerenders data-free public routes with Puppeteer into `dist/_prerender/`.
- `server/_core/prerenderCache.ts` loads `dist/_prerender/*.html` at production startup. `server/_core/vite.ts` serves prerendered HTML first, otherwise falls back to `injectSeoIntoHtml`.
- `client/public/robots.txt` uses `search=yes, ai-train=no`: retrieval/search/social/archive bots can reach public pages; training-only bots are blocked; app/API/auth routes are disallowed.
- `client/public/llms.txt` lists core public pages, all service slugs from `shared/serviceSlugs.ts`, and selected blog posts.
- Focused tests: `server/spaRoutes.test.ts` and `server/_core/prerender-cache.test.ts`.

---

## 4. Routing Rules

```ts
import { Route, Switch, Link, useLocation } from "wouter";
```

- Use `<Link href="/dashboard">`, not plain `<a>`, for in-app navigation.
- `useLocation()` returns `[location, setLocation]`.
- For programmatic navigation: `const [, navigate] = useLocation(); navigate("/dashboard")`.
- wouter is patched; see `patches/wouter@3.7.1.patch`.

---

## 5. Tailwind CSS v4

- No `tailwind.config.js`; theme config lives in [`client/src/index.css`](../../../client/src/index.css) under `@theme inline`.
- Colors use OKLCH. CSS custom color vars should use space-separated `H S% L%` values without wrapping in `hsl(...)`.
- Dark mode is class-driven through `ThemeContext.tsx`; use explicit `dark:` variants.
- Custom keyframes live in `index.css`: `animate-page-enter`, `hero-card-float`, `skeleton-crossfade`, etc.

---

## 6. Component Patterns

- shadcn/ui primitives live in [`client/src/components/ui/`](../../../client/src/components/ui/).
- Icons: `lucide-react` for actions/UI; `react-icons/si` for company logos.
- Radix `<SelectItem>` requires a non-empty `value`.
- If a form silently fails, inspect `form.formState.errors`.
- Every interactive element needs a `data-testid` following `{action}-{target}` or `{type}-{content}-{id}`.

---

## 7. Refactor Landmarks

- `client/src/pages/subscriber/Dashboard.tsx` is a composition shell; feature UI lives in `client/src/components/subscriber/dashboard/`.
- `client/src/pages/subscriber/LetterDetail.tsx` is a composition shell; status-specific UI lives in `client/src/components/subscriber/letter-detail/`.
- Keep the existing modular `{index.tsx, sub-component.tsx}` pattern for compound pages.
- Before moving a file to a subdirectory, read the Module Move Checklist in `docs/AGENT_GUIDE.md`.

---

## 8. tRPC Client

- Client setup: [`client/src/lib/trpc.ts`](../../../client/src/lib/trpc.ts).
- TanStack Query v5 uses object form.
- Invalidate query keys after mutations. Import `queryClient` from `@/lib/queryClient` where the local pattern uses it.
- No `import React` is required because Vite handles the JSX transform.

---

## 9. Realtime And Streaming

- [`useLetterRealtime`](../../../client/src/hooks/useLetterRealtime.ts) subscribes to Supabase Realtime letter status changes.
- [`useLetterStream`](../../../client/src/hooks/useLetterStream.ts) streams `pipeline_stream_chunks` for the LangGraph path.

---

## 10. Vite Manual Chunks

Configured in `vite.config.ts`: `vendor-tiptap`, `vendor-stripe`, `vendor-supabase`, `vendor-radix`, `vendor-pdf`, `vendor-ai`, `vendor-icons`, `vendor-react`.

Do not add a Vite proxy; Express and Vite are already integrated in `server/_core/vite.ts`.

---

## 11. Common Pitfalls

- `useAuth` lives at `client/src/_core/hooks/useAuth.ts`, not `client/src/hooks/useAuth.ts`.
- Frontend env vars must be `VITE_*` and read through `import.meta.env`.
- Sentry init must remain the first import in `main.tsx`.
- PDF generation happens on subscriber `clientApprove`, not when the attorney approves.
- New pages must be added to `App.tsx`; wouter does not auto-route.

---

## 12. Specialist-Skill Cross-References

- UI design: [`skills-audit/corrected/ttml-ui-design-expert/SKILL.md`](../../../skills-audit/corrected/ttml-ui-design-expert/SKILL.md)
- Routing: [`plugins/route-handle/skills/route-handle/SKILL.md`](../../../plugins/route-handle/skills/route-handle/SKILL.md)

---

**Sources read:** `client/src/App.tsx`, glob of `client/src/pages/**/*.tsx`, `server/spaRoutes.ts`, `server/_core/vite.ts`, `server/_core/prerenderCache.ts`, `scripts/prerender.ts`, `client/public/robots.txt`, `client/public/llms.txt`, `server/spaRoutes.test.ts`, `server/_core/prerender-cache.test.ts`, `AGENTS.md`, `CLAUDE.md`.
