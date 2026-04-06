import { FileTransport } from "./transports/FileTransport.js";
import { WebhookTransport } from "./transports/WebhookTransport.js";

export class TelemetryBus {
  constructor(config) {
    this.transports = [];

    if (config.telemetry.file.enabled) {
      this.transports.push(new FileTransport(config.telemetry.file.path));
    }

    if (config.telemetry.webhook.enabled) {
      this.transports.push(new WebhookTransport(config.telemetry.webhook.url));
    }
  }

  emit(type, data) {
    const payload = {
      ts: new Date().toISOString(),
      type,
      data
    };

    for (const t of this.transports) {
      t.send(payload);
    }
  }
}
