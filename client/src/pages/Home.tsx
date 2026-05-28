import { useAuth } from "@/_core/hooks/useAuth";
import { getRoleDashboard } from "@/components/ProtectedRoute";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle2,
  ArrowRight,
  Shield,
  FileText,
  Play,
  HelpCircle,
  Menu,
  X,
  Scale,
  ChevronDown,
  ChevronUp,
  FileSignature,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Banknote,
  KeyRound,
  Briefcase,
  Sparkles,
} from "lucide-react";
import BrandLogo from "@/components/shared/BrandLogo";
import HowItWorks from "@/components/HowItWorks";
import FeaturesSection from "@/components/FeaturesSection";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/shared/Footer";
import FirstVisitPopup from "@/components/FirstVisitPopup";
import CategoryPicker from "@/components/CategoryPicker";
import { PRICING } from "@shared/pricing";

const proofPoints = [
  {
    icon: FileSignature,
    title: "Attorney-signed",
    body: "A licensed California attorney reviews and approves every letter, not just AI output.",
  },
  {
    icon: Clock,
    title: "Fast online intake",
    body: "Describe your situation in minutes. No appointments, no waiting rooms.",
  },
  {
    icon: Scale,
    title: "Serious, structured tone",
    body: "Clear, firm, and grounded in real California statutes.",
  },
  {
    icon: Shield,
    title: "Built for real disputes",
    body: "Payments, contracts, property, employment, and more.",
  },
];

const soundFamiliar = [
  {
    q: `"I know I need to respond — I just don't know what to say."`,
    a: "You're staring at a blank page. You don't want to come off as emotional, weak, or careless. You want it to land.",
  },
  {
    q: `"I can't afford a lawyer for every small dispute."`,
    a: "A traditional attorney letter runs $500 to $2,000 before anyone responds. Your issue is serious enough to need a real letter — not serious enough to justify a retainer.",
  },
  {
    q: `"I tried writing it myself, but it doesn't sound strong enough."`,
    a: "You know exactly what happened. Turning that into a structured, attorney-grade letter is a different skill entirely.",
  },
  {
    q: `"They keep ignoring me."`,
    a: "A normal email is easy to brush off. A letter on legal footing, signed by an attorney, gets read differently.",
  },
  {
    q: `"I'm scared of saying the wrong thing."`,
    a: "One careless line can weaken your whole position. You want to be clear, professional, and strategic — not exposed.",
  },
  {
    q: `"I just want this resolved."`,
    a: "You're not trying to start a war. You want the payment, the repair, the apology, the settlement — a path forward.",
  },
];

const letterTypes = [
  {
    icon: Banknote,
    title: "Demand for Payment",
    body: "Unpaid invoices, overdue balances, money you're owed and can't get back.",
  },
  {
    icon: FileText,
    title: "Breach of Contract",
    body: "When someone ignored an agreement, a written promise, or the terms you both signed.",
  },
  {
    icon: Shield,
    title: "Cease and Desist",
    body: "For behavior that needs to stop now: harassment, defamation, misuse, repeated violations.",
  },
  {
    icon: Scale,
    title: "Pre-Litigation Settlement",
    body: "Resolve a dispute on serious terms before it becomes a lawsuit.",
  },
  {
    icon: Banknote,
    title: "Debt Collection",
    body: "For businesses, contractors, and individuals recovering money the professional way.",
  },
  {
    icon: KeyRound,
    title: "Property & Lease Issues",
    body: "Security deposits, repairs, lease violations, landlord and tenant disputes.",
  },
  {
    icon: Briefcase,
    title: "Employment & Workplace",
    body: "Unpaid wages, disputes, and formal written responses to an employer.",
  },
  {
    icon: FileSignature,
    title: "Something Else",
    body: "A serious issue that doesn't fit a box but still needs a serious written response.",
  },
];

const whatYouGet = [
  {
    title: "A letter built around your facts",
    body: "You explain what happened. We turn it into a clean, organized, professional letter, not a fill-in-the-blank template.",
  },
  {
    title: "A real attorney's signature",
    body: "Every letter is reviewed and approved by a licensed California attorney before it reaches you. This is the line that separates us from a chatbot.",
  },
  {
    title: "A serious, credible tone",
    body: "No emotional rambling. No weak wording. Firm, structured, and grounded in California law.",
  },
  {
    title: "Faster than starting from scratch",
    body: "Skip days of searching templates and rewriting the same paragraph ten times. Submit the facts and move forward.",
  },
  {
    title: "Grounded in real California law",
    body: "Your letter cites the statutes that actually apply to your situation, not generic boilerplate.",
  },
  {
    title: "A documented record",
    body: "A formal letter creates a written record of your position, your request, and the timeline. That matters if the dispute escalates.",
  },
];

// TODO: replace with real testimonials
const placeholderTestimonials = [
  {
    quote:
      "I knew what happened. I had no idea how to say it professionally. They turned my mess into a clear letter that actually sounded serious.",
  },
  {
    quote:
      "I'd already sent emails for weeks and got nothing. The attorney-signed letter changed the conversation overnight — they finally responded.",
  },
  {
    quote:
      "It saved me from saying the wrong thing. I got my deposit back without ever stepping into a courtroom.",
  },
  {
    quote:
      "Exactly what a small business needs. Not every dispute is worth a full legal battle, but a real letter makes all the difference.",
  },
];

const faqs = [
  {
    q: "Will this replace hiring a lawyer?",
    a: "No — and we won't pretend otherwise. This is professional legal-letter drafting with licensed attorney review and approval. For full representation, courtroom strategy, or ongoing legal counsel, you'll still want to retain an attorney directly. For a serious letter that moves a dispute, this is built exactly for that.",
  },
  {
    q: "Is this just an AI template generator?",
    a: "No. We research the California law that applies to your facts, draft the letter around your actual situation, and route it to a licensed California attorney who reviews, edits, and signs it before delivery. The attorney signature is the whole point.",
  },
  {
    q: "How does the free first letter work?",
    a: "Your first letter — including the attorney review — is completely free, with no credit card required to start. We do it so you can judge the quality before paying for anything.",
  },
  {
    q: "What does it cost after the first one?",
    a: `A single additional letter is ${PRICING.oneTimeLetter.priceDisplay}, one-time. If you deal with disputes regularly, monthly and yearly plans bring the per-letter cost down. No hourly billing, ever.`,
  },
  {
    q: "What types of letters can I get?",
    a: "Demand and payment letters, breach of contract, cease and desist, pre-litigation settlement, debt collection, property and lease letters, employment matters, and custom requests.",
  },
  {
    q: "Can I use this for my business?",
    a: "Yes. Business owners, contractors, freelancers, landlords, agencies, and vendors use it for unpaid invoices, contract breaches, and formal payment demands.",
  },
  {
    q: "How fast is it?",
    a: "You submit online in minutes. Most letters are drafted, attorney-reviewed, and back to you within 24–48 hours, and you can track the status the whole way.",
  },
  {
    q: "Is my information confidential?",
    a: "Yes. Your data is encrypted in transit and at rest, and our attorneys are bound by professional confidentiality obligations.",
  },
  {
    q: "Is this legal advice?",
    a: "The service provides legal-letter preparation and attorney review. For advice on your specific legal strategy or representation, consult a licensed attorney directly.",
  },
];

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      navigate(getRoleDashboard(user.role));
    }
  }, [loading, isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const goToLogin = () => {
    navigate("/login");
  };

  const goToSignup = () => {
    navigate("/signup");
  };

  const goToLoginWithCategory = (categoryId: string) => {
    const submitPath = `/submit?type=${encodeURIComponent(categoryId)}`;
    if (isAuthenticated) {
      navigate(submitPath);
    } else {
      navigate(`/signup?next=${encodeURIComponent(submitPath)}`);
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const homeJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Talk to My Lawyer",
      url: "https://www.talk-to-my-lawyer.com",
      logo: "https://www.talk-to-my-lawyer.com/logo-main.png",
      description:
        "Professional attorney-reviewed legal letters drafted in minutes. Demand letters, cease and desist, breach of contract, and more.",
      foundingDate: "2024",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@talk-to-my-lawyer.com",
        contactType: "customer support",
        availableLanguage: "English",
      },
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "Talk to My Lawyer",
      url: "https://www.talk-to-my-lawyer.com",
      logo: "https://www.talk-to-my-lawyer.com/logo-main.png",
      description:
        "Professional attorney-reviewed legal letters for California residents. Demand letters, cease and desist, breach of contract, employment disputes, and more.",
      "@id": "https://www.talk-to-my-lawyer.com/#localbusiness",
      address: {
        "@type": "PostalAddress",
        addressRegion: "CA",
        addressCountry: "US",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: "36.7783",
        longitude: "-119.4179",
      },
      areaServed: {
        "@type": "State",
        name: "California",
      },
      priceRange: `$${PRICING.oneTimeLetter.price}-$${PRICING.yearly.price}`,
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "17:00",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Talk to My Lawyer",
      url: "https://www.talk-to-my-lawyer.com",
      applicationCategory: "LegalService",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "First letter free, no credit card required",
      },
      description:
        "Get professional, attorney-reviewed legal letters in minutes. Demand letters, cease and desist, breach of contract, and more.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Talk to My Lawyer",
      url: "https://www.talk-to-my-lawyer.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate:
            "https://www.talk-to-my-lawyer.com/?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "LegalService",
      name: "Talk to My Lawyer",
      url: "https://www.talk-to-my-lawyer.com",
      description:
        "Attorney-drafted legal letters at a flat fee — demand letters, cease and desist, breach of contract, and more. Your first letter is completely free.",
      areaServed: "California",
      serviceType: [
        "Demand Letter",
        "Cease and Desist Letter",
        "Breach of Contract Letter",
        "Debt Collection Letter",
        "Security Deposit Demand Letter",
        "Harassment Cease and Desist Letter",
        "Defamation Cease and Desist Letter",
        "Insurance Claim Demand Letter",
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Legal Letter Plans",
        itemListElement: [
          {
            "@type": "Offer",
            name: "Single Letter",
            description: "One attorney-drafted legal letter",
            price: String(PRICING.oneTimeLetter.price),
            priceCurrency: "USD",
            eligibleQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitText: "letter",
            },
          },
          {
            "@type": "Offer",
            name: "Monthly Subscription",
            description: "Ongoing legal letter service billed monthly",
            price: String(PRICING.monthly.price),
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(PRICING.monthly.price),
              priceCurrency: "USD",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: 1,
                unitCode: "MON",
              },
            },
          },
          {
            "@type": "Offer",
            name: "Annual Subscription",
            description: "Ongoing legal letter service billed annually",
            price: String(PRICING.yearly.price),
            priceCurrency: "USD",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(PRICING.yearly.price),
              priceCurrency: "USD",
              referenceQuantity: {
                "@type": "QuantitativeValue",
                value: 1,
                unitCode: "ANN",
              },
            },
          },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.talk-to-my-lawyer.com/",
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>
          Attorney-Drafted Legal Letters — Demand Letters &amp; Cease and Desist
          | Talk to My Lawyer
        </title>
        <meta
          name="description"
          content="Get attorney-drafted legal letters in minutes — flat fee, no hourly billing. Demand letters, cease and desist, breach of contract, and more. Your first letter is completely free."
        />
        <link rel="canonical" href="https://www.talk-to-my-lawyer.com/" />
        <meta
          property="og:title"
          content="Attorney-Drafted Legal Letters — Demand Letters &amp; Cease and Desist | Talk to My Lawyer"
        />
        <meta
          property="og:description"
          content="Get attorney-drafted legal letters in minutes — flat fee, no hourly billing. Demand letters, cease and desist, breach of contract, and more. Your first letter is completely free."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.talk-to-my-lawyer.com/" />
        <meta
          property="og:image"
          content="https://www.talk-to-my-lawyer.com/logo-main.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Attorney-Drafted Legal Letters — Demand Letters &amp; Cease and Desist | Talk to My Lawyer"
        />
        <meta
          name="twitter:description"
          content="Attorney-drafted legal letters at a flat fee — demand letters, cease and desist, breach of contract, and more. Your first letter is completely free."
        />
        <meta
          name="twitter:image"
          content="https://www.talk-to-my-lawyer.com/logo-main.png"
        />
        <script type="application/ld+json">{JSON.stringify(homeJsonLd)}</script>
      </Helmet>
      <FirstVisitPopup />
      <div className="min-h-screen bg-white font-['Inter'] text-slate-900 overflow-x-hidden">
        {/* Nav */}
        <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-[64px] md:h-[72px] flex items-center justify-between">
            <BrandLogo href="/" size="lg" hideWordmarkOnMobile />

            <div className="hidden md:flex items-center gap-7">
              <button
                onClick={() => scrollTo("features")}
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 tracking-wide uppercase transition-colors"
                data-testid="nav-features"
              >
                Features
              </button>
              <Link
                href="/services"
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 tracking-wide uppercase transition-colors"
                data-testid="nav-services"
              >
                Services
              </Link>
              <button
                onClick={() => scrollTo("pricing")}
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 tracking-wide uppercase transition-colors"
                data-testid="nav-pricing"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollTo("faq")}
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 tracking-wide uppercase transition-colors"
                data-testid="nav-faq"
              >
                FAQ
              </button>
              {/* Doc Analyzer desktop nav link removed 2026-05-20 — feature
                  temporarily disabled. Restore alongside PublicNav.tsx entry. */}
              <Link
                href="/blog"
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 tracking-wide uppercase transition-colors"
                data-testid="nav-blog"
              >
                Blog
              </Link>
              <div className="w-px h-4 bg-slate-200" />
              <button
                onClick={goToLogin}
                className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                data-testid="nav-signin"
              >
                Sign In
              </button>
              <button
                onClick={goToSignup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-[13px] font-bold transition-all shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5"
                data-testid="nav-cta"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              className="md:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Toggle menu"
              data-testid="nav-mobile-toggle"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 shadow-lg">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    scrollTo("features");
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-slate-700 py-2 uppercase tracking-wide text-left"
                  data-testid="mobile-features"
                >
                  Features
                </button>
                <Link
                  href="/services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-semibold text-slate-700 py-2 uppercase tracking-wide text-left"
                  data-testid="mobile-services"
                >
                  Services
                </Link>
                <button
                  onClick={() => {
                    scrollTo("pricing");
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-slate-700 py-2 uppercase tracking-wide text-left"
                  data-testid="mobile-pricing"
                >
                  Pricing
                </button>
                <button
                  onClick={() => {
                    scrollTo("faq");
                    setMobileMenuOpen(false);
                  }}
                  className="text-sm font-semibold text-slate-700 py-2 uppercase tracking-wide text-left"
                  data-testid="mobile-faq"
                >
                  FAQ
                </button>
                {/* Doc Analyzer mobile nav link removed 2026-05-20 — see desktop comment above. */}
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={goToLogin}
                  className="text-sm font-semibold text-slate-700 py-2 text-left"
                  data-testid="mobile-signin"
                >
                  Sign In
                </button>
                <button
                  onClick={goToSignup}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold w-full text-center"
                  data-testid="mobile-cta"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </nav>

        <main>
          {/* Split Hero */}
          <section className="relative min-h-screen flex flex-col lg:flex-row pt-[64px] md:pt-[72px]">
            <div className="w-full lg:w-[60%] flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-8 sm:py-12 lg:py-0">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 mb-6 sm:mb-8 text-xs sm:text-sm text-blue-700 font-medium">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse flex-shrink-0"></span>
                  Your first letter is free — no card required
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-[2.8rem] lg:text-[3.2rem] xl:text-[3.6rem] font-extrabold leading-[1.12] tracking-tight mb-6 sm:mb-8">
                  Stop handling legal letters{" "}
                  <span className="text-blue-600 relative inline-block">
                    alone
                    <svg
                      className="absolute w-full h-3 -bottom-1 left-0 text-blue-200"
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 5 Q 50 10 100 5"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                      />
                    </svg>
                  </span>
                  .
                </h1>

                <div className="space-y-4 text-base sm:text-lg lg:text-xl text-slate-600 mb-8 sm:mb-10 max-w-xl leading-relaxed">
                  <p>
                    You don't always need a courtroom, a retainer, or three
                    weeks of back-and-forth. Sometimes you just need the right
                    letter — written clearly, backed by California law, and
                    signed by a real attorney before it goes out.
                  </p>
                  <p>
                    Talk to My Lawyer turns your situation into a professional,
                    attorney-reviewed legal letter built to be taken seriously.
                    Payment dispute, broken contract, cease and desist, security
                    deposit, unpaid invoice — you describe what happened, and a
                    licensed California attorney reviews and signs the letter
                    before it's delivered.
                  </p>
                  <p className="font-semibold text-slate-800">
                    Stop guessing what to write. Start with a letter that gets a
                    response.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <button
                    onClick={goToSignup}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 transition-all"
                    data-testid="hero-cta"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Generate my first letter — free
                  </button>
                  <button
                    onClick={() => scrollTo("how-it-works")}
                    className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all"
                    data-testid="hero-pricing"
                  >
                    See how it works <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-8 sm:mb-10">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0"></span>
                    Attorney-signed in California
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0"></span>
                    Grounded in real California law
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0"></span>
                    First letter free
                  </div>
                </div>

                <CategoryPicker onCategorySelect={goToLoginWithCategory} />
              </div>
            </div>

            <div className="w-full lg:w-[40%] bg-blue-600 relative overflow-hidden hidden lg:flex items-center justify-center p-12">
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 opacity-50"></div>
              <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0,transparent_100%)]"></div>

              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col hero-card-float">
                <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="p-8 flex-1 bg-white flex flex-col gap-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="hero-doc-line hero-doc-line-1"></div>
                    <div className="hero-doc-line hero-doc-line-2"></div>
                    <div className="hero-doc-line hero-doc-line-3"></div>
                    <div className="hero-doc-line hero-doc-line-4"></div>
                  </div>
                  <div className="hero-doc-badge mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                    <div className="mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-green-900 mb-1">
                        Attorney Approved
                      </div>
                      <div className="text-xs text-green-700">
                        Reviewed by J. Smith, Esq. on{" "}
                        {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="px-2">
                    <svg
                      viewBox="0 0 220 48"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-40 h-10"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 36 C20 10, 36 8, 44 24 C52 40, 48 44, 56 30 C62 18, 70 14, 78 22 C86 30, 82 40, 90 32 C98 24, 106 12, 116 20 C126 28, 120 40, 130 34 C138 28, 144 16, 154 24 C162 30, 160 40, 170 34 C178 28, 184 22, 194 28 C202 33, 206 38, 212 36"
                        stroke="#1e3a5f"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="520"
                        strokeDashoffset="520"
                        className="hero-doc-signature"
                        style={{ fill: "none" }}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Proof Bar */}
          <section className="py-10 sm:py-14 px-4 sm:px-6 lg:px-12 bg-white border-y border-slate-100">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {proofPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm mb-1">
                      {p.title}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Urgency Strip */}
          <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-12 bg-slate-900 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/10 mb-5">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-5">
                The longer you wait, the weaker your position gets.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-3xl mx-auto">
                A heated text, a rambling email, or a demand letter you found on
                Google can make a dispute worse — and it can be used against you
                later. A clear, attorney-reviewed letter does the opposite: it
                documents your position, creates real pressure, and signals that
                you're prepared to follow through.
              </p>
              <button
                onClick={goToSignup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-lg text-base font-semibold inline-flex items-center gap-2 shadow-xl shadow-blue-900/40 transition-all"
                data-testid="urgency-cta"
              >
                Start my letter now <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* Sound Familiar? */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Sound familiar?
                </h2>
                <p className="text-lg text-slate-600">
                  The exact thoughts going through your head right now.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                {soundFamiliar.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                      <p className="font-semibold text-slate-900 text-lg leading-snug">
                        {item.q}
                      </p>
                    </div>
                    <p className="text-slate-600 leading-relaxed pl-8">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What TTML Actually Is */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10 sm:mb-12">
                <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                  <Scale className="w-4 h-4" /> What Talk to My Lawyer Actually
                  Is
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                  A serious, attorney-backed letter — without hiring a firm by
                  the hour.
                </h2>
              </div>
              <div className="space-y-5 text-lg text-slate-600 leading-relaxed mb-10">
                <p>
                  Talk to My Lawyer is a legal-letter service built for people
                  who need a serious, attorney-backed letter without hiring a
                  firm by the hour.
                </p>
                <p>
                  You describe your situation. We research the relevant
                  California law, draft a structured letter around your actual
                  facts, and route it to a licensed California attorney who
                  reviews it, edits it, and signs off before it's delivered to
                  you.
                </p>
              </div>
              <div className="space-y-3 max-w-2xl mx-auto">
                {[
                  "It is NOT raw AI text you copy and hope for the best.",
                  "It is NOT a generic template that knows nothing about your case.",
                  "It is NOT an angry email dressed up in legal words.",
                ].map((line, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 bg-white rounded-xl p-4 border border-slate-200"
                  >
                    <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-700 font-medium">{line}</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-lg text-slate-700 font-semibold mt-10 max-w-2xl mx-auto">
                It's a cleaner, faster, more credible way to turn your problem
                into a professional response — at a fraction of what a firm
                would charge.
              </p>
            </div>
          </section>

          {/* Horizontal Timeline "How it Works" */}
          <div id="how-it-works">
            <HowItWorks />
          </div>

          {/* Letter Types */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                  <FileText className="w-4 h-4" /> Letter Types
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  A serious letter for whatever you're dealing with
                </h2>
                <p className="text-lg text-slate-600">
                  Every one is researched against California law and signed by a
                  licensed attorney.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {letterTypes.map((t, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all"
                    data-testid={`letter-type-${i}`}
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                      <t.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{t.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What You Get */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                  <CheckCircle2 className="w-4 h-4" /> What You Get
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                  More than words on a page
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {whatYouGet.map((item, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-200"
                  >
                    <CheckCircle2 className="w-7 h-7 text-blue-600 mb-4" />
                    <h3 className="font-bold text-slate-900 text-lg mb-2">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Alternating Layout Features */}
          <FeaturesSection />

          {/* Old Way vs Better Way */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50">
            <div className="max-w-6xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                  Old way vs. a better way
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
                  <div className="inline-flex items-center gap-2 text-red-500 font-semibold mb-4 text-sm tracking-wide uppercase">
                    <XCircle className="w-4 h-4" /> The Old Way
                  </div>
                  <p className="text-slate-600 leading-relaxed text-lg">
                    Search Google for a template. Copy legal language you don't
                    fully understand. Rewrite it five times. Still feel unsure.
                    Send it and hope. Or call a firm, brace for the retainer,
                    and wait.
                  </p>
                </div>
                <div className="bg-blue-600 rounded-2xl p-6 sm:p-8 border border-blue-500 shadow-xl shadow-blue-900/20">
                  <div className="inline-flex items-center gap-2 text-blue-100 font-semibold mb-4 text-sm tracking-wide uppercase">
                    <Sparkles className="w-4 h-4" /> The Better Way
                  </div>
                  <p className="text-blue-50 leading-relaxed text-lg">
                    Describe your situation. We research the law and draft your
                    letter. A licensed attorney reviews and signs it. You send a
                    response that's hard to ignore — and move the dispute
                    forward.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Why This Works */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-white">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                <Scale className="w-4 h-4" /> Why This Works
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-8">
                Most people lose leverage simply because they communicate badly.
              </h2>
              <div className="space-y-5 text-lg text-slate-600 leading-relaxed text-left">
                <p>
                  They send angry emails. They make vague demands. They leave
                  out the facts that matter and pile in the ones that don't.
                  They sound unsure. They wait too long.
                </p>
                <p>
                  A proper, attorney-signed letter changes the entire tone of a
                  dispute. It tells the other side four things at once:{" "}
                  <span className="font-semibold text-slate-900">
                    This is serious. The facts are documented. The request is
                    clear. The next step isn't optional.
                  </span>
                </p>
                <p className="font-semibold text-slate-900">
                  That shift alone is often enough to get a response — or a
                  check.
                </p>
              </div>
            </div>
          </section>

          {/* By the Numbers — Trust Section */}
          <section
            id="trust"
            className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-white to-slate-50"
            data-testid="trust-section"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
                <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                  <Shield className="w-4 h-4" /> By the Numbers
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                  Results You Can Trust
                </h2>
                <p className="text-lg text-slate-600">
                  Our service is built on data-driven outcomes and professional
                  legal standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                <div
                  className="text-center p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  data-testid="trust-stat-settlement"
                >
                  <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 mb-2">
                    60%
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">
                    Settlement Rate
                  </div>
                  <p className="text-sm text-slate-500">
                    Demand letters result in settlement 60% of the time vs. 36%
                    without one.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Source: American Bar Association research on pre-litigation
                    correspondence
                  </p>
                </div>

                <div
                  className="text-center p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  data-testid="trust-stat-review"
                >
                  <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 mb-2">
                    24hr
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">
                    Attorney-Reviewed
                  </div>
                  <p className="text-sm text-slate-500">
                    Every letter is reviewed by a licensed attorney within 24
                    hours.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Average turnaround during business days
                  </p>
                </div>

                <div
                  className="text-center p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  data-testid="trust-stat-price"
                >
                  <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 mb-2">
                    {PRICING.oneTimeLetter.priceDisplay}
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">
                    Starting Price
                  </div>
                  <p className="text-sm text-slate-500">
                    Flat-fee pricing with no hourly billing surprises. First
                    letter free.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Compare to $500–$2,000+ for traditional attorney letters
                  </p>
                </div>

                <div
                  className="text-center p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  data-testid="trust-stat-types"
                >
                  <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 mb-2">
                    10+
                  </div>
                  <div className="text-base font-semibold text-slate-900 mb-1">
                    Letter Types
                  </div>
                  <p className="text-sm text-slate-500">
                    Demand letters, cease & desist, breach of contract,
                    employment disputes, and more.
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    California-focused legal language and workflows
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Testimonials
            items={placeholderTestimonials}
            title="Real people, real disputes, real responses"
            subtitle="The difference a professional letter makes isn't subtle."
          />

          {/* Meet TTML */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10 sm:mb-12">
                <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                  <Scale className="w-4 h-4" /> Meet Talk to My Lawyer
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">
                  The practical middle step that should have existed all along.
                </h2>
              </div>
              <div className="space-y-5 text-lg text-slate-600 leading-relaxed">
                <p>
                  Talk to My Lawyer was built for the gap almost everyone falls
                  into: your dispute is too serious to ignore, but too small to
                  justify a $400-an-hour retainer.
                </p>
                <p>
                  For most people, that leaves two bad options — write a weak
                  letter yourself and hope, or pay a firm a fortune before you
                  even know whether the other side will respond.
                </p>
                <p>
                  We built a third path. A professional, attorney-reviewed
                  letter, grounded in California law, that costs a fraction of a
                  firm and goes out with a licensed attorney's signature on it.
                  It's the practical middle step that should have existed all
                  along — a real letter, without the retainer.
                </p>
                <p className="font-semibold text-slate-900">
                  Your first one is free. We'd rather you see the quality before
                  you ever pay us.
                </p>
              </div>
            </div>
          </section>

          {/* Pricing - Horizontal Stacked Cards */}
          <section
            id="pricing"
            className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-slate-900 text-white"
          >
            <div className="max-w-7xl mx-auto">
              <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white">
                  Structured Drafting + Attorney Review — Starting at{" "}
                  {PRICING.oneTimeLetter.priceDisplay}
                </h2>
                <p className="text-lg text-slate-400">
                  Your first letter is free. After that, a single letter or a
                  plan that brings the per-letter cost down — every letter
                  signed by a licensed California attorney.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:gap-6 max-w-5xl mx-auto">
                <div
                  className="flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
                  data-testid="pricing-single-letter"
                >
                  <div className="w-full md:w-1/3 mb-6 md:mb-0">
                    <h3 className="text-2xl font-bold mb-1">Single Letter</h3>
                    <p className="text-slate-400 text-sm">
                      Best for a one-time legal need
                    </p>
                  </div>
                  <div className="w-full md:w-1/3 flex flex-col items-start md:items-center mb-6 md:mb-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {PRICING.oneTimeLetter.priceDisplay}
                      </span>
                      <span className="text-slate-400"> one-time</span>
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 flex justify-start md:justify-end">
                    <button
                      onClick={goToSignup}
                      className="w-full md:w-auto px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-lg transition-colors text-center"
                      data-testid="pricing-cta-single-letter"
                    >
                      Get Started
                    </button>
                  </div>
                </div>

                <div
                  className="flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 rounded-2xl bg-blue-600 border border-blue-500 shadow-2xl shadow-blue-900/50 relative transform md:scale-105 z-10"
                  data-testid="pricing-monthly"
                >
                  <div className="absolute -top-3 left-8 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                  <div className="w-full md:w-1/3 mb-6 md:mb-0">
                    <h3 className="text-2xl font-bold mb-1">Monthly</h3>
                    <p className="text-blue-200 text-sm">
                      Best for ongoing legal matters
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-700/50 px-3 py-1 rounded-md text-xs font-medium text-blue-100">
                      <FileText className="w-3 h-3" />{" "}
                      {PRICING.monthly.lettersIncluded} letters per month
                      included
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 flex flex-col items-start md:items-center mb-6 md:mb-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {PRICING.monthly.priceDisplay}
                      </span>
                      <span className="text-blue-200">/mo</span>
                    </div>
                    <p className="text-blue-200 text-xs mt-1">
                      $
                      {(
                        PRICING.monthly.price / PRICING.monthly.lettersIncluded
                      ).toFixed(2)}{" "}
                      per letter
                    </p>
                  </div>
                  <div className="w-full md:w-1/3 flex justify-start md:justify-end">
                    <button
                      onClick={goToSignup}
                      className="w-full md:w-auto px-6 py-2.5 bg-white text-blue-700 hover:bg-slate-50 font-bold rounded-lg transition-colors shadow-lg text-center"
                      data-testid="pricing-cta-monthly"
                    >
                      Subscribe Now
                    </button>
                  </div>
                </div>

                <div
                  className="flex flex-col md:flex-row items-center justify-between p-5 sm:p-8 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors relative"
                  data-testid="pricing-yearly"
                >
                  <div className="absolute -top-3 left-8 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Best Value
                  </div>
                  <div className="w-full md:w-1/3 mb-6 md:mb-0">
                    <h3 className="text-2xl font-bold mb-1">Yearly</h3>
                    <p className="text-slate-400 text-sm">
                      Best value for ongoing legal needs
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-700/50 px-3 py-1 rounded-md text-xs font-medium text-slate-300">
                      <FileText className="w-3 h-3" />{" "}
                      {PRICING.yearly.lettersIncluded} letters per year included
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 flex flex-col items-start md:items-center mb-6 md:mb-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {PRICING.yearly.priceDisplay}
                      </span>
                      <span className="text-slate-400">/yr</span>
                    </div>
                  </div>
                  <div className="w-full md:w-1/3 flex justify-start md:justify-end">
                    <button
                      onClick={goToSignup}
                      className="w-full md:w-auto px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-lg transition-colors text-center"
                      data-testid="pricing-cta-yearly"
                    >
                      Subscribe Yearly
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Two-Column FAQ */}
          <section
            id="faq"
            className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-white"
          >
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-16">
              <div className="w-full lg:w-1/3">
                <div className="sticky top-32">
                  <div className="inline-flex items-center gap-2 text-blue-600 font-semibold mb-4 text-sm tracking-wide uppercase">
                    <HelpCircle className="w-4 h-4" /> FAQ
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-slate-900">
                    Common Questions
                  </h2>
                  <p className="text-lg text-slate-600 mb-8">
                    Everything you need to know about our legal letter service,
                    how it works, and our attorney review process.
                  </p>
                  <Link
                    href="/faq"
                    className="text-blue-600 font-semibold flex items-center gap-2 hover:gap-3 transition-all"
                    data-testid="faq-view-all"
                  >
                    View All FAQs <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="w-full lg:w-2/3">
                <div className="divide-y divide-slate-200">
                  {faqs.map((faq, i) => (
                    <div key={i} className="py-6" data-testid={`faq-item-${i}`}>
                      <button
                        className="w-full flex items-center justify-between text-left focus:outline-none group"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        data-testid={`faq-toggle-${i}`}
                      >
                        <span
                          className={`text-base sm:text-lg md:text-xl font-semibold pr-4 sm:pr-8 transition-colors ${openFaq === i ? "text-blue-600" : "text-slate-900 group-hover:text-blue-600"}`}
                        >
                          {faq.q}
                        </span>
                        <span
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${openFaq === i ? "bg-blue-50 border-blue-200 text-blue-600" : "border-slate-200 text-slate-400 group-hover:border-blue-200 group-hover:text-blue-600"}`}
                        >
                          {openFaq === i ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"}`}
                      >
                        <p className="text-slate-600 leading-relaxed text-lg">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 lg:px-12 bg-blue-600 text-center">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
                The right letter could change the conversation.
              </h2>
              <p className="text-blue-100 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-2xl mx-auto">
                Don't send another email that gets ignored. Don't copy another
                template you're not sure about. Don't wait until your position
                gets weaker. Describe your situation and get a professional,
                attorney-signed letter built to be taken seriously — your first
                one free.
              </p>
              <button
                onClick={goToSignup}
                className="bg-white text-blue-600 hover:bg-slate-50 px-6 py-3 rounded-lg text-base font-bold shadow-2xl transition-transform hover:-translate-y-1 inline-block"
                data-testid="final-cta"
              >
                Start my free letter
              </button>

              <div className="mt-10 flex flex-wrap justify-center items-center gap-6 lg:gap-10 text-white font-medium">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5" /> Attorney-reviewed
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> Clear process
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> First letter free
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
