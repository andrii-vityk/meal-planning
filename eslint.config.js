import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Architecture boundaries.
 *
 * Dependencies point inward only:
 *   ui -> application -> domain
 *   infrastructure -> application -> domain
 * The composition root (src/main.tsx, src/composition/**) is the only place
 * that may know every layer.
 *
 * Cross-folder imports must use the "@/" alias (relative "../" imports are
 * forbidden), so the rules below cannot be bypassed with relative paths.
 */
const layer = (name, forbidden) => ({
  files: [`src/${name}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: ["../*"], message: "Use the '@/' alias for imports outside the current folder." },
          ...forbidden.map((target) => ({
            group: [target, `${target}/*`],
            message: `The '${name}' layer must not depend on '${target}'.`,
          })),
        ],
      },
    ],
  },
});

export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
  layer("domain", ["@/application", "@/infrastructure", "@/ui", "@/composition", "react", "react-dom"]),
  layer("application", ["@/infrastructure", "@/ui", "@/composition", "react", "react-dom"]),
  layer("infrastructure", ["@/ui", "@/composition"]),
  layer("ui", ["@/infrastructure", "@/composition"]),
);
