import type { SVGProps } from "react";

/**
 * Brand glyphs for LinkedIn and X (formerly Twitter).
 *
 * lucide-react v1 removed ALL brand icons (trademark/legal reasons), so the
 * former `Linkedin` / `Twitter` lucide imports no longer exist. These small
 * self-contained components fill that gap without adding a dependency. The path
 * data is the official brand glyph from Simple Icons (https://simpleicons.org,
 * CC0). They mirror lucide's API: render at 24×24 by default and accept a
 * `className` (e.g. Tailwind `w-3 h-3`) which overrides the size via CSS, and
 * use `currentColor` so they inherit text color like the surrounding lucide
 * icons did.
 */

export function LinkedinIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/** X (formerly Twitter). */
export function XIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      {...props}
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}
