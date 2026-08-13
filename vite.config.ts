// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const stripTanstackSourceTagsFromR3F = () => ({
  name: "strip-tanstack-source-tags-from-r3f",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.includes("/src/components/customizer/") || !/\.[jt]sx(?:\?|$)/.test(id)) {
      return null;
    }

    const stripped = code.replace(/\sdata-tsd-source=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, "");
    return stripped === code ? null : { code: stripped, map: null };
  },
});

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// nitro builds the deploy bundle from this entry.
export default defineConfig({
  plugins: [stripTanstackSourceTagsFromR3F()],
  tanstackStart: {
    server: { entry: "server" },
  },
  // Target Vercel's Build Output API so deploys are served natively on Vercel.
  // Overrides the Lovable wrapper's cloudflare-module default preset.
  nitro: { preset: "vercel" },
});
