import { Link } from "wouter";
import { motion } from "framer-motion";

/**
 * The IrForge orange-robot mark. Shared by the landing page, the sidebar,
 * and the BrandHomeButton below so there's a single source of truth for
 * the logo artwork instead of copy-pasted inline SVGs.
 */
export function OrangeRobot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor">
      {/* antenna */}
      <line x1="24" y1="4" x2="24" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="3.5" r="2.5" />
      {/* head */}
      <rect x="11" y="10" width="26" height="18" rx="5" />
      {/* eyes */}
      <circle cx="19" cy="19" r="3" fill="hsl(0 0% 5%)" />
      <circle cx="29" cy="19" r="3" fill="hsl(0 0% 5%)" />
      <circle cx="20" cy="18" r="1" fill="white" opacity="0.6" />
      <circle cx="30" cy="18" r="1" fill="white" opacity="0.6" />
      {/* mouth */}
      <rect x="18" y="24" width="12" height="2.5" rx="1.25" fill="hsl(0 0% 5%)" opacity="0.7" />
      {/* ears */}
      <rect x="7" y="15" width="4" height="8" rx="2" />
      <rect x="37" y="15" width="4" height="8" rx="2" />
      {/* body */}
      <rect x="13" y="30" width="22" height="14" rx="4" />
      {/* chest panel */}
      <rect x="18" y="33" width="5" height="5" rx="1.5" fill="hsl(0 0% 5%)" opacity="0.3" />
      <rect x="25" y="33" width="5" height="5" rx="1.5" fill="hsl(0 0% 5%)" opacity="0.3" />
      {/* legs */}
      <rect x="16" y="45" width="6" height="3" rx="1.5" />
      <rect x="26" y="45" width="6" height="3" rx="1.5" />
    </svg>
  );
}

/**
 * Clickable brand mark that always returns the user to the landing page ("/").
 * Render this on every page EXCEPT the landing page itself, per design spec —
 * it gives people a consistent, obvious way back to the home screen.
 */
export function BrandHomeButton({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Back to homepage" data-testid="link-brand-home">
      <motion.div
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={`flex aspect-square size-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm cursor-pointer ${className}`}
      >
        <OrangeRobot className="size-5 text-primary-foreground" />
      </motion.div>
    </Link>
  );
}
