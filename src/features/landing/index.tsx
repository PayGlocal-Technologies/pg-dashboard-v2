"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { BrandLogo } from "@/features/auth/components/BrandLogo";
import { AUTH_BACKGROUND } from "@/features/auth/background";
import { useAuthView } from "@/stores/useAuthView";
import dynamic from "next/dynamic";

// Client-only: the dots are computed from map data on the client, so the
// landing page itself server-renders instantly and the globe fills in after.
const LandingGlobe = dynamic(
  () => import("@/features/landing/components/LandingGlobe").then((m) => m.LandingGlobe),
  { ssr: false }
);

/**
 * DESIGN MOCK — public landing page shown before sign-in / sign-up.
 *
 * Nav links are placeholders with no destinations. "Login" goes straight to
 * /login; "Get Started" / "Get started for free" play a slow hand-off into
 * the sign-up screen (see SignUpTransition). Stats are illustrative, not live.
 */

const NAV_LINKS = ["Products", "Solutions", "Company", "Partners", "Documentation", "Pricing"];

const TRUST: { icon: IconName; label: string }[] = [
  { icon: "shield-check", label: "RBI PA authorized" },
  { icon: "check-circle", label: "PCI-DSS Level 1" },
  { icon: "zap", label: "99.99% uptime" },
];

const STATS: { icon: IconName; label: string; value: string }[] = [
  { icon: "circle-dollar-sign", label: "Total transaction volume", value: "$4,527,318,406" },
  { icon: "repeat", label: "Transactions processed", value: "18,246,913" },
  { icon: "building-2", label: "Active merchants", value: "10,438" },
];

const SIGN_UP_PATH = "/login";
const EASE = [0.65, 0, 0.35, 1] as const;

/**
 * Covers the landing page with the sign-up screen's own composition — flat
 * #f1f1f1 with the gradient panel sweeping in from the left at exactly the
 * sign-up layout's 50% width — and only navigates once the sweep finishes, so
 * the real page mounts under an identical frame instead of cutting to it.
 */
function SignUpTransition({ onDone }: { onDone: () => void }) {
  return (
    // One slow crossfade, no sideways travel: the sign-up screen's own
    // full-screen background fades in over the landing page while the
    // landing content fades out, so nothing moves and only the picture
    // changes. Same image, fit and anchor as the auth layout, so navigation
    // (which waits for the fade) lands on an identical frame.
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.1, ease: EASE }}
      onAnimationComplete={onDone}
    >
      {/* A barely-there settle (4% → 100% scale, from the top-left anchor)
          so the wash reads as arriving rather than switching on; it ends at
          exactly the framing the sign-up page renders. */}
      <motion.div
        className="absolute inset-0 hidden origin-top-left lg:block"
        initial={{ scale: 1.04 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.3, ease: EASE }}
      >
        <AppImage
          src={AUTH_BACKGROUND}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-left-top"
        />
      </motion.div>
    </motion.div>
  );
}

export function LandingFeature() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const setAuthView = useAuthView((s) => s.setView);

  // Warm the sign-up route so the hand-off never waits on a fetch.
  useEffect(() => {
    router.prefetch(SIGN_UP_PATH);
  }, [router]);

  function goToSignIn() {
    setAuthView("signIn");
    router.push(SIGN_UP_PATH);
  }

  function goToSignUp() {
    setAuthView("account");
    if (reduceMotion) {
      router.push(SIGN_UP_PATH);
      return;
    }
    setLeaving(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 lg:h-screen lg:overflow-hidden">
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        {/* Nav */}
        <header className="flex h-[72px] shrink-0 items-center gap-10 border-b border-slate-200 px-6 lg:px-10">
          <BrandLogo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV_LINKS.map((label) => (
              <Button
                key={label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 min-h-0 px-3.5 text-[14px] font-medium text-slate-800"
              >
                {label}
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goToSignIn}
              className="h-10 min-h-10 rounded-full bg-white px-6 text-[14px] shadow-none"
            >
              Login
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={goToSignUp}
              className="h-10 min-h-10 rounded-full px-6 text-[14px]"
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero, framed by the design's hairline side rules */}
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col border-x border-slate-200">
          <section className="grid min-h-0 flex-1 items-center gap-8 px-6 py-10 lg:grid-cols-2 lg:px-16">
            <div className="max-w-xl">
              <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">
                International payment gateway
              </p>
              <h1 className="mt-4 text-[40px] font-semibold leading-[1.1] tracking-tight xl:text-[48px]">
                The{" "}
                <span className="bg-linear-to-r from-primary to-[#6b8cf5] bg-clip-text text-transparent">
                  international payment gateway
                </span>{" "}
                India builds on.
              </h1>
              <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
                Start accepting global payments in 24 hours. Get up to 96% success rate at checkout
                and a 24 hours settlement in INR.
              </p>
              <p className="mt-3 text-[15px] font-medium text-slate-900">
                All on RBI-licensed rails, built for Indian businesses.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={goToSignUp}
                className="mt-8 h-11 min-h-11 rounded-full px-7 text-[15px]"
              >
                Get started for free
              </Button>
              <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                {TRUST.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center gap-1.5 text-[13px] text-slate-600"
                  >
                    <Icon name={t.icon} className="h-4 w-4 text-primary" aria-hidden />
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden h-full min-h-0 items-center justify-center lg:flex">
              <LandingGlobe className="aspect-square h-full max-h-[34rem] max-w-full" />
            </div>
          </section>

          {/* Stats strip */}
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-10 gap-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <Icon name={s.icon} className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-[12px] uppercase tracking-wide text-slate-500">
                  {s.label}:
                </span>
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[13px] font-semibold tabular-nums text-slate-900">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {leaving && <SignUpTransition onDone={() => router.push(SIGN_UP_PATH)} />}
      </AnimatePresence>
    </div>
  );
}
