import { Vec3 } from "vec3";

const MODES = ["circle", "spiral", "random", "mixed"];

/**
 * Planner skeleton:
 * - Uses bounded random / circle / spiral waypoint generation in ±3000 zone.
 * - Includes lightweight obstacle probe hook for future prismarine-chunk integration.
 */
export class RoutePlanner3D {
  constructor(config) {
    this.config = config;
    this.step = 0;
  }

  nextWaypoint(currentPos) {
    this.step += 1;
    const mode = this.#resolveMode();
    const y = this.config.patrol.altitude.target;

    if (mode === "circle") return this.#circleWaypoint(y);
    if (mode === "spiral") return this.#spiralWaypoint(y);
    if (mode === "random") return this.#randomWaypoint(y);

    // mixed: mostly random, sometimes geometric to avoid looking too robotic.
    if (this.step % 7 === 0) return this.#circleWaypoint(y);
    if (this.step % 5 === 0) return this.#spiralWaypoint(y);

    return this.#randomWaypoint(y, currentPos);
  }

  computeAvoidanceVector(bot, distance = this.config.flight.obstacleScanDistance) {
    const yaw = bot.entity?.yaw ?? 0;
    const pos = bot.entity?.position;
    if (!pos) return new Vec3(0, 0, 0);

    const ahead = new Vec3(
      Math.round(pos.x - Math.sin(yaw) * distance),
      Math.round(pos.y),
      Math.round(pos.z - Math.cos(yaw) * distance)
    );

    const block = bot.blockAt(ahead);
    if (block && block.boundingBox === "block") {
      // Simple side-step vector. Replace with full 3D search graph.
      return new Vec3(Math.cos(yaw) * 10, 2, -Math.sin(yaw) * 10);
    }

    return new Vec3(0, 0, 0);
  }

  #resolveMode() {
    const mode = this.config.patrol.mode;
    return MODES.includes(mode) ? mode : "mixed";
  }

  #circleWaypoint(y) {
    const { minX, maxX, minZ, maxZ } = this.config.patrol.bounds;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const radius = Math.min((maxX - minX), (maxZ - minZ)) * 0.45;
    const angle = (this.step % 360) * (Math.PI / 180);
    return new Vec3(Math.round(cx + Math.cos(angle) * radius), y, Math.round(cz + Math.sin(angle) * radius));
  }

  #spiralWaypoint(y) {
    const { minX, maxX, minZ, maxZ } = this.config.patrol.bounds;
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const maxRadius = Math.min((maxX - minX), (maxZ - minZ)) * 0.45;
    const t = (this.step % 240) / 240;
    const radius = 50 + maxRadius * t;
    const angle = this.step * 0.31;
    return new Vec3(Math.round(cx + Math.cos(angle) * radius), y, Math.round(cz + Math.sin(angle) * radius));
  }

  #randomWaypoint(y, currentPos = null) {
    const { minX, maxX, minZ, maxZ } = this.config.patrol.bounds;

    if (!currentPos) {
      return new Vec3(this.#rand(minX, maxX), y, this.#rand(minZ, maxZ));
    }

    // Semi-random local hops to keep motion fluid.
    const hop = 250 + Math.floor(Math.random() * 600);
    const angle = Math.random() * Math.PI * 2;
    const x = Math.round(currentPos.x + Math.cos(angle) * hop);
    const z = Math.round(currentPos.z + Math.sin(angle) * hop);
    return new Vec3(this.#clamp(x, minX, maxX), y, this.#clamp(z, minZ, maxZ));
  }

  #rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  #clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
}
