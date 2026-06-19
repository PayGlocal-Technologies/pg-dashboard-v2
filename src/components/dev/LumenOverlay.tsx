"use client";

// Dev-only wrapper for the Lumen design agent overlay.
//
// The agent's JS and its stylesheet are imported together here so that a single
// `next/dynamic` import of THIS module pulls in both. Importing the `.css` file
// directly inside `next/dynamic` fails under Turbopack ("not an ecmascript
// client_module"), because the dynamic loader must resolve one JS client module.
//
// This file is only ever imported from the `process.env.NODE_ENV === "development"`
// branch in the root layout, so it (and the agent + styles it pulls in) is
// dead-code-eliminated from production builds.
import { DesignAgentOverlay } from "@payglocal_ui/lumen/client";
import "@payglocal_ui/lumen/styles.css";

export default DesignAgentOverlay;
