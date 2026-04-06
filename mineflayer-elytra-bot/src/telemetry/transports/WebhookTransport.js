export class WebhookTransport {
  constructor(url) {
    this.url = url;
  }

  async send(payload) {
    if (!this.url) return;
    await fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }
}
