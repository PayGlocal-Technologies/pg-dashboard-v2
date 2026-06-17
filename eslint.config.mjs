import next from "eslint-config-next";
import pluginQuery from "@tanstack/eslint-plugin-query";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  ...next,
  ...pluginQuery.configs["flat/recommended"],
  prettier,
  {
    rules: {
      // Icons must go through the centralized <Icon/> (registry is the only allowed lucide importer).
      // All internal imports must use the @/ alias — never relative parent traversal.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message:
                "Import icons via the centralized <Icon/> component (@/components/icon). Only components/icon/registry.ts may import lucide-react directly.",
            },
            {
              name: "react-hook-form",
              message: "Use @tanstack/react-form instead of react-hook-form.",
            },
            {
              name: "@hookform/resolvers/zod",
              message: "Use @tanstack/react-form with zod validators instead.",
            },
          ],
          patterns: [
            {
              group: ["../*", "../../*", "../../../*", "../../../../*"],
              message:
                "Use the @/ path alias for all internal imports (e.g. @/features/login/schemas). See CLAUDE.md.",
            },
          ],
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // The icon registry is the single source allowed to import the icon package.
    files: ["src/components/icon/registry.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
