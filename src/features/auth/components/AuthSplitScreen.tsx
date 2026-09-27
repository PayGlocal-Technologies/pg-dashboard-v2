"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import { isSignInView, useAuthView } from "@/stores/useAuthView";

interface PanelContent {
  /** Transparent PNG; width/height are its intrinsic size. */
  image: { src: string; width: number; height: number };
  /** Max width within the panel; the sign-in artwork is wider and flatter
   *  than the globe, so it needs more width to read at the same weight. */
  maxWidth: string;
  title: string;
  subtitle?: string;
}

const SIGN_UP: PanelContent = {
  image: { src: "/assets/login_globe.png", width: 2992, height: 2736 },
  maxWidth: "max-w-[72%]",
  title: "Trusted by 10,000+ merchants to power payments worldwide.",
};

const SIGN_IN: PanelContent = {
  image: { src: "/assets/signin.png", width: 3252, height: 2604 },
  maxWidth: "max-w-[92%]",
  title: "More ways to get things done.",
  subtitle: "Explore everything PayGlocal can do for your business.",
};

/**
 * Brand panel on the left of the auth screens (desktop only): an
 * illustration and a caption, one set for sign-up and another for sign-in,
 * crossfading as the form switches. The pastel artwork behind it is the auth
 * layout's own full-screen background, so this panel is transparent.
 */
export function AuthSplitScreen() {
  const isSignIn = useAuthView((s) => isSignInView(s.view));
  const content = isSignIn ? SIGN_IN : SIGN_UP;

  return (
    <div className="relative hidden flex-col overflow-hidden lg:flex">
      <div className="h-12 shrink-0" aria-hidden />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={content.image.src}
          className="flex min-h-0 flex-1 flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Illustration */}
          <motion.div
            className="relative flex min-h-0 flex-1 items-center justify-center p-8"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <AppImage
              src={content.image.src}
              alt=""
              width={content.image.width}
              height={content.image.height}
              priority
              className={cn("h-auto max-h-full w-auto object-contain", content.maxWidth)}
            />
          </motion.div>

          {/* Caption band */}
          <div className="shrink-0 px-10 py-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
              className="mx-auto max-w-md text-center"
            >
              <p className="text-2xl font-medium leading-snug tracking-tight text-balance text-slate-900 xl:text-[28px]">
                {content.title}
              </p>
              {content.subtitle && (
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                  {content.subtitle}
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="h-8 shrink-0" aria-hidden />
    </div>
  );
}
