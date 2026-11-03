import type { LegalSubject } from "../../shared/types/letter";

export type ToneIntensity = "moderate" | "firm" | "aggressive";

export interface LetterTypeProfile {
  /** What kind of letter this is, in plain words. */
  category: string;
  /** The emotional register the draft should be written in. */
  sentiment: string;
  /** What the letter should center on. */
  focus: string;
  /** Extra things to avoid for this category (on top of the global facts-only rules). */
  limits: string;
  /** Strongest tone the sender may select for this category. */
  maxTone: ToneIntensity;
}

/**
 * One profile per letter type. Keyed on LegalSubject, so adding a type to
 * LEGAL_SUBJECTS without a profile here is a compile error. These are sent
 * with every request so the model writes in the right register; they never
 * supply facts.
 */
export const LETTER_TYPE_PROFILES: Record<LegalSubject, LetterTypeProfile> = {
  "demand-letter": {
    category: "Payment or performance demand",
    sentiment: "firm and businesslike; confident and expecting a prompt response; no hostility",
    focus: "the amount or action owed and what it is for; one clear demand with a deadline",
    limits: "do not add amounts, interest or fees that were not provided",
    maxTone: "aggressive",
  },
  "cease-and-desist": {
    category: "Request to stop specific conduct",
    sentiment: "serious, formal and unambiguous; calm authority with no insults",
    focus: "the exact conduct complained of, when it occurred, the request that it stop and not recur, and written confirmation of compliance",
    limits: "do not allege motives, intent or harm the sender did not describe",
    maxTone: "aggressive",
  },
  "contract-breach": {
    category: "Notice of breach of contract",
    sentiment: "firm, precise and formal; contract-focused rather than personal",
    focus: "the agreement (date, parties, subject), the obligation not performed, and what the sender asks as a cure",
    limits: "do not quote or characterize contract terms the sender did not describe",
    maxTone: "aggressive",
  },
  "eviction-notice": {
    category: "Notice relating to a tenancy ending",
    sentiment: "formal, neutral and factual; no pressure or threats",
    focus: "the property address, the tenancy and the specific reason, as given",
    limits: "do not present the letter as a statutory eviction notice, and do not state any notice period or legal requirement",
    maxTone: "firm",
  },
  "employment-dispute": {
    category: "Workplace dispute",
    sentiment: "measured, professional and respectful but clear",
    focus: "the employment relationship and dates, the issue, and what the sender asks for",
    limits: "do not characterize the employer's motives or label conduct as illegal, retaliatory or discriminatory unless the sender's words do",
    maxTone: "firm",
  },
  "consumer-complaint": {
    category: "Complaint about a product or service",
    sentiment: "polite but firm; solution-oriented",
    focus: "what was bought or provided and when, what went wrong, the prior contacts, and the remedy requested",
    limits: "do not call the product defective, unsafe or deceptive unless the sender did; do not cite consumer-protection laws",
    maxTone: "aggressive",
  },
  "pre-litigation-settlement": {
    category: "Offer to resolve a dispute without a lawsuit",
    sentiment: "constructive and cooperative while clear on the terms",
    focus: "a neutral summary of the dispute, the proposed resolution and its terms, and the deadline to accept",
    limits: "do not propose any term, amount or concession the sender did not give; do not describe the strength of the case",
    maxTone: "firm",
  },
  "debt-collection": {
    category: "Request for payment of a debt",
    sentiment: "professional, factual and calm; never threatening or pressuring",
    focus: "the amount owed, what it is for and when it was due, and how to pay if provided",
    limits: "no harassment, false urgency, day counts, interest or fees; do not state what the debtor is legally required to do",
    maxTone: "firm",
  },
  "estate-probate": {
    category: "Estate or probate correspondence",
    sentiment: "respectful, measured and sensitive to the circumstances",
    focus: "the specific request (information, documents, access or distribution) and a reasonable deadline",
    limits: "do not state legal duties of executors or heirs; avoid emotional language",
    maxTone: "moderate",
  },
  "landlord-tenant": {
    category: "Rental dispute short of eviction",
    sentiment: "factual, neutral and firm; cooperative in manner",
    focus: "the property address, the tenancy, and the specific issue (rent, repairs, a lease issue, or a security deposit), as given",
    limits: "do not state statutory deadlines or tenant or landlord rights; for deposits ask only for what the sender asked for",
    maxTone: "firm",
  },
  "insurance-dispute": {
    category: "Dispute with an insurer",
    sentiment: "firm, methodical and claim-focused; professional",
    focus: "the policy or claim number, the date of loss or denial, what happened, and what the sender asks the insurer to do",
    limits: "do not allege bad faith or cite insurance regulations; do not state coverage terms the sender did not describe",
    maxTone: "firm",
  },
  "personal-injury-demand": {
    category: "Request for compensation after an injury",
    sentiment: "serious, factual and restrained; respectful of the sender's situation without being emotional",
    focus: "the incident, the injuries and treatment only as provided, the damages only with figures given, and a request for a response",
    limits: "do not describe injuries, treatment, fault or damages beyond what is provided; do not state a settlement figure unless one was provided",
    maxTone: "firm",
  },
  "intellectual-property": {
    category: "Notice about use of a protected work, brand or mark",
    sentiment: "firm, formal and precise about what is claimed",
    focus: "the work, brand or mark and the use complained of, as given, with a request that the use stop and written confirmation",
    limits: "do not mention registration, ownership documents, numbers or dates unless provided; do not name specific damages",
    maxTone: "aggressive",
  },
  "family-law": {
    category: "Family matter correspondence",
    sentiment: "calm, respectful and non-adversarial; never aggressive",
    focus: "the specific request and a reasonable deadline",
    limits: "no accusations, no commentary on character or parenting, no legal conclusions; avoid emotional language",
    maxTone: "moderate",
  },
  "neighbor-hoa": {
    category: "Dispute with a neighbor or homeowners association",
    sentiment: "courteous, calm and reasonable; aimed at preserving the relationship",
    focus: "the specific issue, the specific request (a repair, access, or compliance), and a reasonable deadline",
    limits: "do not cite association rules, ordinances or covenants unless the sender named them; avoid accusation",
    maxTone: "moderate",
  },
  "general-legal": {
    category: "General legal correspondence",
    sentiment: "professional, clear and firm",
    focus: "the stated outcome as the demand, supported by the facts given",
    limits: "do not assume the type of dispute beyond what the sender described",
    maxTone: "firm",
  },
};

// Weakest to strongest.
const TONE_ORDER: ToneIntensity[] = ["moderate", "firm", "aggressive"];

/** The sender's chosen tone, lowered if the category does not allow it. */
export function effectiveTone(
  requested: string | undefined,
  maxTone: ToneIntensity
): ToneIntensity {
  const wanted = TONE_ORDER.find(t => t === requested) ?? "firm";
  return TONE_ORDER.indexOf(wanted) > TONE_ORDER.indexOf(maxTone) ? maxTone : wanted;
}

/** Profile for a letter type; unknown types fall back to general-legal. */
export function getLetterTypeProfile(letterType: string | undefined): LetterTypeProfile {
  const key = (letterType ?? "") as LegalSubject;
  return LETTER_TYPE_PROFILES[key] ?? LETTER_TYPE_PROFILES["general-legal"];
}
