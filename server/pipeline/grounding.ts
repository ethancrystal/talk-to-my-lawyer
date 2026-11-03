/**
 * Cheap, deterministic check that a drafted letter does not contain dollar
 * amounts or calendar dates that the sender never provided. The prompt already
 * forbids invention; this catches a slip before the draft is saved.
 *
 * Amounts are compared as numbers ($689 matches 689.00). Dates are compared as
 * month + day (the year is ignored), and the request's dates may be written as
 * "September 3", "2026-09-03" or "9/3/2026".
 */

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const isDigit = (ch: string | undefined): boolean =>
  ch !== undefined && ch >= "0" && ch <= "9";

/** Leading run of digits, commas and dots at the start of `text`, as a number (NaN if none). */
function leadingNumber(text: string): number {
  let run = "";
  for (const ch of text.split("")) {
    if (isDigit(ch) || ch === "," || ch === ".") run += ch;
    else break;
  }
  while (run.endsWith(".") || run.endsWith(",")) run = run.slice(0, -1);
  return parseFloat(run.split(",").join(""));
}

/** Every number in the text, so request amounts match however they were typed. */
function numbersIn(text: string): Set<number> {
  const found = new Set<number>();
  let index = 0;
  while (index < text.length) {
    if (isDigit(text[index])) {
      const value = leadingNumber(text.slice(index));
      if (Number.isFinite(value)) found.add(value);
      while (index < text.length && (isDigit(text[index]) || text[index] === "," || text[index] === ".")) {
        index += 1;
      }
    } else {
      index += 1;
    }
  }
  return found;
}

/** Amounts written with a dollar sign, e.g. "$2,850.00". */
function dollarAmountsIn(text: string): number[] {
  return text
    .split("$")
    .slice(1)
    .map(leadingNumber)
    .filter(Number.isFinite);
}

/** Up to two digits at the start of `text` (after optional spaces), as a number. */
function leadingDay(text: string): number | null {
  const trimmed = text.trimStart();
  const digits = [trimmed[0], trimmed[1]].filter(isDigit).join("");
  return digits ? Number(digits) : null;
}

/** Month-day keys like "8-3" (September 3) for every date written in the text. */
function monthDayKeysIn(text: string): Set<string> {
  const keys = new Set<string>();
  const lower = text.toLowerCase();

  // "September 3" / "September 3, 2026"
  MONTHS.forEach((name, monthIndex) => {
    let from = 0;
    let at = lower.indexOf(name, from);
    while (at !== -1) {
      const day = leadingDay(lower.slice(at + name.length));
      if (day !== null) keys.add(`${monthIndex}-${day}`);
      from = at + name.length;
      at = lower.indexOf(name, from);
    }
  });

  // "2026-09-03" (ISO)
  for (let i = 0; i + 10 <= text.length; i += 1) {
    const s = text.slice(i, i + 10);
    const shape = s.split("").map(ch => (isDigit(ch) ? "d" : ch)).join("");
    if (shape === "dddd-dd-dd") {
      keys.add(`${Number(s.slice(5, 7)) - 1}-${Number(s.slice(8, 10))}`);
    }
  }

  // "9/3/2026" or "9/3/26" (US numeric)
  text.split("/").forEach((part, i, parts) => {
    if (i === 0 || i === parts.length - 1) return;
    const month = Number(part.slice(-2).replace(/\D/g, ""));
    const day = leadingDay(parts[i + 1]);
    if (month >= 1 && month <= 12 && day !== null) keys.add(`${month - 1}-${day}`);
  });

  return keys;
}

/**
 * Amounts and dates in `letter` that do not appear in `request` (the request
 * text the model was given). Empty means everything is grounded.
 */
export function findUngroundedFigures(letter: string, request: string): string[] {
  const requestNumbers = numbersIn(request);
  const requestDates = monthDayKeysIn(request);
  const issues: string[] = [];

  new Set(dollarAmountsIn(letter)).forEach(amount => {
    if (!requestNumbers.has(amount)) issues.push(`amount $${amount}`);
  });

  monthDayKeysIn(letter).forEach(key => {
    if (!requestDates.has(key)) {
      const [month, day] = key.split("-").map(Number);
      issues.push(`date ${MONTHS[month]} ${day}`);
    }
  });

  return issues;
}
