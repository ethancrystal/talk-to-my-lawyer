import { useWebMCP } from "use-webmcp-tool";
import { useLocation } from "wouter";
import { PRICING } from "../../../shared/pricing";
import {
  getServiceBySlug,
  SERVICES,
  SERVICE_SLUGS,
} from "../pages/services/serviceData";

type EmptyInput = Record<string, never>;
type ServiceInput = { slug: string };

const EMPTY_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const SERVICE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    slug: {
      type: "string",
      enum: SERVICE_SLUGS,
      description: "The URL slug of the legal-letter service.",
    },
  },
  required: ["slug"],
  additionalProperties: false,
} as const;

const READ_ONLY = { readOnlyHint: true } as const;

function isPublicMarketingRoute(path: string): boolean {
  const normalizedPath = path.length > 1 ? path.replace(/\\/+$/, "") : path;

  return (
    normalizedPath === "/" ||
    normalizedPath === "/services" ||
    normalizedPath === "/pricing" ||
    normalizedPath === "/faq" ||
    /^\\/services\\/[^/]+$/.test(normalizedPath)
  );
}

/**
 * Exposes public, read-only website information to browser agents.
 *
 * Intentionally excludes authenticated workflows, legal matter submissions,
 * client portal tokens, letter contents, user records, billing mutations,
 * attorney review actions, and any other private or consequential operation.
 */
export default function WebMCPTools() {
  const [location] = useLocation();
  const enabled = isPublicMarketingRoute(location);

  useWebMCP<EmptyInput, Record<string, unknown>>({
    name: "get_website_overview",
    description:
      "Returns a brief overview of Talk to My Lawyer and the limits of this public information interface.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY,
    enabled,
    execute: () => ({
      name: "Talk to My Lawyer",
      website: "https://www.talk-to-my-lawyer.com",
      serviceFocus: "California-focused legal-letter drafting",
      purpose:
        "Helps visitors learn about the site's public legal-letter services and plans.",
      limitations: [
        "This tool provides general website information, not legal advice.",
        "It does not assess a person's facts, recommend a legal strategy, or create an attorney-client relationship.",
        "Do not submit confidential, personal, or case-specific information through these public tools.",
        "No legal result or outcome is guaranteed.",
      ],
    }),
  });

  useWebMCP<EmptyInput, Record<string, unknown>>({
    name: "list_legal_letter_services",
    description:
      "Lists the legal-letter services publicly described on the website.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY,
    enabled,
    execute: () => ({
      services: SERVICES.map(service => ({
        slug: service.slug,
        title: service.title,
        keyword: service.keyword,
        summary: service.heroDescription,
        url: `https://www.talk-to-my-lawyer.com/services/${service.slug}`,
      })),
    }),
  });

  useWebMCP<ServiceInput, Record<string, unknown>>({
    name: "get_legal_letter_service",
    description:
      "Returns the public description of one listed legal-letter service.",
    inputSchema: SERVICE_INPUT_SCHEMA,
    annotations: READ_ONLY,
    enabled,
    execute: ({ slug }) => {
      if (typeof slug !== "string") {
        return { error: "A service slug is required.", availableSlugs: SERVICE_SLUGS };
      }

      const service = getServiceBySlug(slug);
      if (!service) {
        return {
          error: "That service slug was not found.",
          availableSlugs: SERVICE_SLUGS,
        };
      }

      return {
        slug: service.slug,
        title: service.title,
        keyword: service.keyword,
        summary: service.heroDescription,
        description: service.metaDescription,
        url: `https://www.talk-to-my-lawyer.com/services/${service.slug}`,
        note: "This is a general service description, not an assessment of a specific legal matter.",
      };
    },
  });

  useWebMCP<EmptyInput, Record<string, unknown>>({
    name: "get_public_pricing",
    description:
      "Returns current public plan pricing from the website's shared pricing constants. Does not start checkout or change a subscription.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: READ_ONLY,
    enabled,
    execute: () => ({
      currency: "USD",
      source: "shared/pricing.ts",
      plans: [
        PRICING.oneTimeLetter,
        PRICING.monthly,
        PRICING.yearly,
      ].map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        priceDisplay: plan.priceDisplay,
        billingPeriod: plan.period,
        lettersIncluded: plan.lettersIncluded,
        description: plan.description,
        features: plan.features,
      })),
      note: "Prices are read from the shared application constants. Confirm the final amount and terms on the pricing page before purchase.",
      pricingUrl: "https://www.talk-to-my-lawyer.com/pricing",
    }),
  });

  return null;
}
