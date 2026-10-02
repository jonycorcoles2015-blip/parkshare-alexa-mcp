import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const workerPath = resolve(root, "dist", "server", "index.js");
const manifestPath = resolve(root, "dist", ".openai", "hosting.json");

const [workerSource, manifestSource] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8")
]);

const manifest = JSON.parse(manifestSource);

if (!Array.isArray(manifest.capabilities) || !manifest.capabilities.includes("mcp")) {
  throw new Error("dist/.openai/hosting.json must include capabilities: [\"mcp\"]");
}

const workerModule = await import(pathToFileURL(workerPath));
if (typeof workerModule.default?.fetch !== "function") {
  throw new Error("dist/server/index.js must export default.fetch");
}

if (!workerSource.includes("tools/list") || !workerSource.includes("tools/call")) {
  throw new Error("Worker must include MCP tool discovery and call handling.");
}

console.log("Artifact validation passed");
