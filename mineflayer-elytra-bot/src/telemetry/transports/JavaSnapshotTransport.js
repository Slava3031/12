import fs from "node:fs";

function escape(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

export class JavaSnapshotTransport {
  constructor(path) {
    this.path = path;
  }

  send(payload) {
    const json = escape(JSON.stringify(payload));
    const java = `public final class BotStateSnapshot {\n  public static final String LAST_EVENT_JSON = \"${json}\";\n}\n`;
    fs.writeFileSync(this.path, java);
  }
}
