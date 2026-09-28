"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AppImage } from "@/components/common/AppImage";
import { AUTH_IMAGE } from "@/features/auth/background";
import { isSignInView, useAuthView } from "@/stores/useAuthView";

interface Caption {
  title: string;
  subtitle?: string;
}

const SIGN_UP: Caption = {
  title: "Trusted by 10,000+ merchants to power payments worldwide.",
};

const SIGN_IN: Caption = {
  title: "More ways to get things done.",
  subtitle: "Explore everything PayGlocal can do for your business.",
};

/** The panel's frame (inset + rounded card). Shared with the landing page's
 *  hand-off so it lands on exactly this frame. */
export const AUTH_PANEL_CLASS = "hidden min-h-0 p-6 lg:flex";
export const AUTH_CARD_CLASS = "relative flex min-h-0 flex-1 overflow-hidden rounded-2xl";

/**
 * Brand panel on the left of the auth screens (desktop only): one rounded
 * image card inset from the page edge, with the caption laid over its
 * bottom-left corner. The image stays put between sign-up and sign-in; only
 * the caption crossfades.
 */
export function AuthSplitScreen() {
  const isSignIn = useAuthView((s) => isSignInView(s.view));
  const caption = isSignIn ? SIGN_IN : SIGN_UP;

  return (
    <div className={AUTH_PANEL_CLASS}>
      <div className={AUTH_CARD_CLASS}>
        <AppImage
          src={AUTH_IMAGE}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />

        <div className="relative mt-auto w-full p-10 xl:p-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={caption.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="max-w-md"
            >
              <p className="text-[28px] font-medium leading-[1.15] tracking-tight text-balance text-slate-900 xl:text-[34px]">
                {caption.title}
              </p>
              {caption.subtitle && (
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                  {caption.subtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
