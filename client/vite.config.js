import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      // No sourcemaps in production -- they map the minified bundle straight
      // back to original source, so anyone opening DevTools could read your
      // unminified code even with the console silenced.
      sourcemap: false,
      // Vite 8 replaced esbuild with Rolldown/Oxc for production builds.
      // The old `esbuild: { drop: [...] }` option (used in Vite ≤7) is
      // silently ignored under Vite 8 -- this is the actual place console
      // stripping needs to happen now. Confirmed against Vite's official
      // migration guide: esbuild.drop -> build.rolldownOptions.output.minify.compress.drop*
      rolldownOptions: isProduction
        ? {
            output: {
              minify: {
                compress: {
                  drop_console: true,
                  drop_debugger: true,
                },
              },
            },
          }
        : {},
    },
  };
});