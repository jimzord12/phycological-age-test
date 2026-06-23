import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // Existing client initialization effects intentionally hydrate local state.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "off",

      // Catches leftover debug logs in committed code.
      "no-console": "warn",

      // Prevents manual `any` escape hatches that bypass strict type checking.
      "@typescript-eslint/no-explicit-any": "error",

      // ---------------------------------------------------------------------------
      // Enable these when the app becomes full-stack (server actions, DB layer, etc).
      // They require type-aware linting (parserOptions.project) which adds ~3-5x
      // overhead to ESLint — worth it once async call sites multiply across the stack.
      // ---------------------------------------------------------------------------
      // "@typescript-eslint/no-floating-promises": "error",       // catches unawaited async calls
      // "@typescript-eslint/no-unnecessary-type-assertion": "error", // removes pointless `as X` casts
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  globalIgnores([".next/**", "coverage/**", "out/**", "build/**", "next-env.d.ts"]),
]);
