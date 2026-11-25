import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const source = resolve("node_modules/@arshad-shah/qpdf-wasm/dist/qpdf.wasm");
const target = resolve("public/qpdf.wasm");
await mkdir(dirname(target), { recursive: true });
await copyFile(source, target);
console.log("Copied qpdf WebAssembly runtime to public/qpdf.wasm");
