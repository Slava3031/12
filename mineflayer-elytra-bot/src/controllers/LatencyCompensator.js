export class LatencyCompensator {
  constructor(networkConfig) {
    this.pingMs = networkConfig.assumedPingMs;
    this.jitterMs = networkConfig.jitterMs;
    this.actionLeadTicks = networkConfig.actionLeadTicks;
  }

  estimateLeadTicks() {
    const ms = this.pingMs + this.jitterMs;
    const ticks = Math.ceil(ms / 50);
    return Math.max(this.actionLeadTicks, ticks);
  }

  updateFromKeepAlive(rttMs) {
    this.pingMs = Math.round(0.8 * this.pingMs + 0.2 * rttMs);
  }
}
