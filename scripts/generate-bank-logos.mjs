/**
 * Generates the bank logo components in src/components/icon/ from Simple
 * Icons (https://simpleicons.org, CC0-1.0; the marks themselves remain their
 * banks' trademarks, used here only to identify the bank beside its name).
 *
 * CLAUDE.md requires every brand SVG to be a forwardRef component in the icon
 * registry that imports only React, so the paths are copied in rather than
 * imported at runtime. Re-run after upgrading simple-icons:
 *
 *   node scripts/generate-bank-logos.mjs && npx prettier --write src/components/icon
 *
 * Banks Simple Icons doesn't carry (SBI, Kotak) are hand-made monogram
 * badges in the same frame (SbiLogo.tsx, KotakLogo.tsx); edit those directly.
 */
import { writeFileSync } from "node:fs";
import { siAxisbank, siHdfcbank, siIcicibank } from "simple-icons";

const BANKS = [
  { component: "HdfcLogo", icon: siHdfcbank },
  { component: "IciciLogo", icon: siIcicibank },
  { component: "AxisLogo", icon: siAxisbank },
];

for (const { component, icon } of BANKS) {
  const file = `src/components/icon/${component}.tsx`;
  writeFileSync(
    file,
    `import { forwardRef, type SVGProps } from "react";

/**
 * ${icon.title}: its mark in white on the brand colour (#${icon.hex}), in the
 * same rounded-square frame as every bank badge. GENERATED from Simple Icons
 * by scripts/generate-bank-logos.mjs; edit that, not this file.
 */
export const ${component} = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => (
  <svg
    ref={ref}
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="${icon.title}"
    {...props}
  >
    <rect width="24" height="24" rx="6" fill="#${icon.hex}" />
    <path transform="translate(4.5 4.5) scale(0.625)" fill="#FFFFFF" d="${icon.path}" />
  </svg>
));
${component}.displayName = "${component}";
`
  );
  console.log(`wrote ${file}`);
}
