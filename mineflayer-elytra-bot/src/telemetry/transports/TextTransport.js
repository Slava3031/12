import fs from "node:fs";

export class TextTransport {
  constructor(path) {
    this.path = path;
  }

  send(payload) {
    const line = `[${payload.ts}] ${payload.type} ${JSON.stringify(payload.data)}\n`;
    fs.appendFileSync(this.path, line);
  }
}
