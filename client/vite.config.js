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
    },
    esbuild: {
      // Strips every console.log/console.info/console.debug/console.warn
      // and every `debugger` statement from the production bundle at build
      // time -- this covers every call site across the app without
      // touching a single component file, and without affecting `npm run
      // dev`, where you still want to see your own logs.
      drop: isProduction ? ["console", "debugger"] : [],
    },
  };
});
