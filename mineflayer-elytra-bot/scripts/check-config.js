import { loadConfig } from "../src/config/loadConfig.js";

const config = loadConfig();

if (!config.server.host || !config.server.username) {
  throw new Error("Invalid server.host or server.username");
}

if (config.telemetry.webhook.enabled && !config.telemetry.webhook.url) {
  throw new Error("Webhook is enabled but telemetry.webhook.url is empty");
}

console.log("Config looks valid.");
