import { build as buildClient } from "vite";
import { readFile } from "node:fs/promises";
import viteConfig from "../vite.config.ts";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const dependencies = Object.keys(packageJson.dependencies ?? {});

if (process.env.BUILD_SERVER_ONLY !== "1") {
  await buildClient({
    ...viteConfig,
    configFile: false,
  });
}

await buildClient({
  ...viteConfig,
  configFile: false,
  root: process.cwd(),
  plugins: [],
  build: {
    ssr: "server/index.ts",
    target: "esnext",
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      external: (id) => dependencies.some((name) => id === name || id.startsWith(`${name}/`)),
      output: { entryFileNames: "index.js" },
    },
  },
});
