import { createLumenHandler } from "@payglocal_ui/lumen/next";

export const { GET, POST, DELETE, runtime, dynamic } = createLumenHandler({
  referenceDirs: ["../Flux", "../pg-dashboard"],
  secretPatterns: [/uidai_certs?_?js/i],
});
