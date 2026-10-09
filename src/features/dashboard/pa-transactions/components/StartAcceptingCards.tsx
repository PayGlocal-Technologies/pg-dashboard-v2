"use client";

import Link from "next/link";
import { AppImage } from "@/components/common/AppImage";

/**
 * The three ways to take a first payment, under the Transactions banner (the
 * design's "Transaction empty state" sub-cards): each image carries its
 * illustration along the bottom and leaves the top plain for the copy.
 */
const PRODUCTS: {
  title: string;
  description: string;
  imageSrc: string;
  /** Where its link goes; null while the product has no page in this app. */
  href: string | null;
  linkLabel: string;
}[] = [
  {
    title: "Payment Links",
    description:
      "Create and share payment links with your customers. No coding or integration required.",
    imageSrc: "/assets/banner-states/txn-%20subcard1.png",
    href: "/payment-links",
    linkLabel: "Create a payment link",
  },
  {
    title: "Payment Pages",
    description:
      "Build a custom payment page for your products and collect payments with a simple, branded checkout experience.",
    imageSrc: "/assets/banner-states/txn%20subcard%202.png",
    // Payment Pages hasn't been migrated yet, so there is nowhere to send it.
    href: null,
    linkLabel: "Create a payment page",
  },
  {
    title: "Static Link",
    description:
      "Give your business a permanent payment link that customers can use to pay you anytime.",
    imageSrc: "/assets/banner-states/txn%20subcard%203.png",
    href: "/static-link",
    linkLabel: "Enable now",
  },
];

export function StartAcceptingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PRODUCTS.map((product) => (
        <section
          key={product.title}
          className="relative isolate aspect-[4/3] overflow-hidden rounded-xl border border-border bg-[#f2f2f2]"
        >
          <AppImage
            src={product.imageSrc}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="-z-10 object-cover object-bottom"
          />
          <div className="px-6 pt-6 sm:px-7 sm:pt-7">
            <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
              {product.title}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/85">
              {product.description}
            </p>
            <div className="mt-3 text-[13.5px]">
              {product.href ? (
                <Link
                  href={product.href}
                  className="text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {product.linkLabel}
                </Link>
              ) : (
                <span className="text-muted-foreground">Coming soon</span>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
