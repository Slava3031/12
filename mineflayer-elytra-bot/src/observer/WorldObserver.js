import { Vec3 } from "vec3";

const HAZARD_BLOCKS = new Set(["lava", "water", "fire", "soul_fire", "cactus"]);

export class WorldObserver {
  constructor(bot, physicsSafety) {
    this.bot = bot;
    this.physicsSafety = physicsSafety;
    this.snapshot = {
      solidAhead: false,
      loadedChunksNearby: 0,
      nearestPlayer: null,
      chunkReliability: 1,
      hazardDensity: 0
    };
  }

  tick() {
    if (!this.bot.entity) return this.snapshot;

    const loadedChunksNearby = this.#countLoadedChunks();
    const chunkReliability = loadedChunksNearby / 9;

    this.snapshot = {
      solidAhead: this.physicsSafety?.hasSolidBlockAhead(8) ?? false,
      loadedChunksNearby,
      nearestPlayer: this.#nearestPlayer(),
      chunkReliability,
      hazardDensity: this.#hazardDensity(this.bot.entity.position, 10)
    };

    return this.snapshot;
  }

  getNodePenalty(pos) {
    const hazard = this.#hazardDensity(pos, 3);
    const reliabilityPenalty = (1 - this.snapshot.chunkReliability) * 30;
    return hazard * 50 + reliabilityPenalty;
  }

  #nearestPlayer() {
    const players = Object.values(this.bot.entities ?? {})
      .filter((e) => e.type === "player" && e.username && e.username !== this.bot.username);
    if (players.length === 0) return null;

    players.sort((a, b) => this.bot.entity.position.distanceSquared(a.position) - this.bot.entity.position.distanceSquared(b.position));
    const p = players[0];
    return {
      username: p.username,
      distance: this.bot.entity.position.distanceTo(p.position)
    };
  }

  #hazardDensity(origin, radius) {
    let samples = 0;
    let hazards = 0;

    for (let dx = -radius; dx <= radius; dx += 2) {
      for (let dz = -radius; dz <= radius; dz += 2) {
        const pos = new Vec3(Math.round(origin.x + dx), Math.round(origin.y - 1), Math.round(origin.z + dz));
        const block = this.bot.blockAt(pos);
        if (!block) continue;
        samples += 1;
        if (HAZARD_BLOCKS.has(block.name) || HAZARD_BLOCKS.has(block.displayName?.toLowerCase())) hazards += 1;
      }
    }

    if (samples === 0) return 0;
    return hazards / samples;
  }

  #countLoadedChunks() {
    const chunkX = Math.floor(this.bot.entity.position.x / 16);
    const chunkZ = Math.floor(this.bot.entity.position.z / 16);
    let loaded = 0;

    for (let x = chunkX - 1; x <= chunkX + 1; x += 1) {
      for (let z = chunkZ - 1; z <= chunkZ + 1; z += 1) {
        if (this.bot.world.getColumnAt(x, z)) loaded += 1;
      }
    }

    return loaded;
  }
}
