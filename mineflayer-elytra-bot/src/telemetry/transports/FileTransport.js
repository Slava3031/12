import fs from "node:fs";

export class FileTransport {
  constructor(path) {
    this.stream = fs.createWriteStream(path, { flags: "a" });
  }

  send(payload) {
    this.stream.write(`${JSON.stringify(payload)}\n`);
  }
}
