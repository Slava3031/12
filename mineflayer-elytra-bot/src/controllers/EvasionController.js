import { Vec3 } from "vec3";

export class EvasionController {
  constructor(bot, keepoutDistance = 15) {
    this.bot = bot;
    this.keepoutDistance = keepoutDistance;
    this.hostileMemory = new Map();
  }

  markHostile(username, reason = "proximity") {
    if (!username) return;
    this.hostileMemory.set(username, { ts: Date.now(), reason });
  }

  decayMemory(maxAgeMs = 3 * 60 * 1000) {
    const now = Date.now();
    for (const [name, meta] of this.hostileMemory.entries()) {
      if ((now - meta.ts) > maxAgeMs) this.hostileMemory.delete(name);
    }
  }

  getNearestThreat() {
    if (!this.bot.entity) return null;
    const players = Object.values(this.bot.entities ?? {})
      .filter((e) => e.type === "player" && e.username && e.username !== this.bot.username);

    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const p of players) {
      const d = this.bot.entity.position.distanceTo(p.position);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
      if (d <= this.keepoutDistance) {
        this.markHostile(p.username, "entered_keepout_zone");
      }
    }

    if (!best) return null;
    return { entity: best, distance: bestDist, hostile: this.hostileMemory.has(best.username) };
  }

  computeEscapeWaypoint(currentPos, threatPos, altitudeTarget) {
    const away = currentPos.minus(threatPos);
    const scale = Math.max(1, 450 / Math.max(1, Math.hypot(away.x, away.z)));
    return new Vec3(
      Math.round(currentPos.x + away.x * scale),
      altitudeTarget,
      Math.round(currentPos.z + away.z * scale)
    );
  }
}
