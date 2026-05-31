import { cp, copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const wasmNative = new URL("../node_modules/@rollup/wasm-node/dist/native.js", import.meta.url);
const wasmBindings = new URL("../node_modules/@rollup/wasm-node/dist/wasm-node", import.meta.url);
const rollupDist = new URL("../node_modules/rollup/dist/", import.meta.url);
const rollupNative = new URL("../node_modules/rollup/dist/native.js", import.meta.url);
const rollupBindings = new URL("../node_modules/rollup/dist/wasm-node", import.meta.url);

if (!existsSync(fileURLToPath(wasmNative)) || !existsSync(fileURLToPath(wasmBindings))) {
  throw new Error("Missing @rollup/wasm-node. Run npm install before starting Vite.");
}

if (!existsSync(fileURLToPath(rollupDist))) {
  throw new Error(`Missing Rollup dist directory under ${rootDir}. Run npm install first.`);
}

await mkdir(fileURLToPath(rollupBindings), { recursive: true });
await copyFile(fileURLToPath(wasmNative), fileURLToPath(rollupNative));
await cp(fileURLToPath(wasmBindings), fileURLToPath(rollupBindings), {
  recursive: true,
  force: true,
});
