import { build } from "esbuild";
import { esbuildPluginPino } from "esbuild-plugin-pino";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// All dependencies that should NOT be bundled
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  "pg-native",
];

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.mjs",
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  external,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
    `.trim(),
  },
});

console.log("Build complete → dist/index.mjs");
