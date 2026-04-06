export class WorldObserver {
  constructor(bot, physicsSafety) {
    this.bot = bot;
    this.physicsSafety = physicsSafety;
    this.snapshot = {
      solidAhead: false,
      loadedChunksNearby: 0,
      nearestPlayer: null
    };
  }

  tick() {
    if (!this.bot.entity) return this.snapshot;

    const nearestPlayer = this.#nearestPlayer();
    this.snapshot = {
      solidAhead: this.physicsSafety?.hasSolidBlockAhead(8) ?? false,
      loadedChunksNearby: this.#countLoadedChunks(),
      nearestPlayer
    };

    return this.snapshot;
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
