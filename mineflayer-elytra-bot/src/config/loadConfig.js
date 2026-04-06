import fs from "node:fs";
import path from "node:path";
import { defaultConfig } from "./defaultConfig.js";

function deepMerge(base, override) {
  if (override == null) return structuredClone(base);
  if (Array.isArray(base) && Array.isArray(override)) return override;
  if (typeof base !== "object" || typeof override !== "object") return override;

  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = k in base ? deepMerge(base[k], v) : v;
  }
  return out;
}

export function loadConfig() {
  const file = process.env.BOT_CONFIG ?? path.resolve(process.cwd(), "config.local.json");
  if (!fs.existsSync(file)) {
    return structuredClone(defaultConfig);
  }

  const userConfig = JSON.parse(fs.readFileSync(file, "utf8"));
  return deepMerge(defaultConfig, userConfig);
}
