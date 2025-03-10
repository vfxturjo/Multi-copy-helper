import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import tailwindcss from "@tailwindcss/vite";
// import { sveltekit } from "@sveltejs/kit/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  base: "./", // Use relative paths for electron
  build: {
    outDir: "../dist/renderer/",
  },
});
