import { FileTransport } from "./transports/FileTransport.js";
import { WebhookTransport } from "./transports/WebhookTransport.js";
import { TextTransport } from "./transports/TextTransport.js";
import { JavaSnapshotTransport } from "./transports/JavaSnapshotTransport.js";

export class TelemetryBus {
  constructor(config) {
    this.transports = [];

    if (config.telemetry.file.enabled) {
      this.transports.push(new FileTransport(config.telemetry.file.path));
    }

    if (config.telemetry.text?.enabled) {
      this.transports.push(new TextTransport(config.telemetry.text.path));
    }

    if (config.telemetry.javaSnapshot?.enabled) {
      this.transports.push(new JavaSnapshotTransport(config.telemetry.javaSnapshot.path));
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
